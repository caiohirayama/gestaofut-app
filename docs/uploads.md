# Uploads (avatar, logo do grupo)

Consome o módulo de storage do `gestaofut-api` (Cloudflare R2 por trás de
URLs presigned — ver o `docs/storage.md` desse repositório). Nenhuma
credencial R2 existe neste app: o único segredo envolvido é a assinatura já
embutida na URL que a API devolve, válida por poucos minutos e para um
único objeto.

## Onde cada pedaço mora

```text
src/features/uploads/                    genérico — nenhuma lógica de avatar/logo aqui
  utils/
    pick-image.ts          expo-image-picker (permissão + seleção) + expo-file-system (tamanho real do arquivo)
    image-upload-policy.ts espelho, só para UX, da política do servidor (tipo/tamanho)
    upload-to-presigned-url.ts   PUT direto pro R2 via expo-file-system (upload binário, não multipart)
  hooks/
    useImageUpload.ts       máquina de estados das 4 etapas do fluxo (genérica sobre o tipo do recurso)
  components/
    ImageUploadPicker.tsx   UI compartilhada: avatar/logo + progresso + erro + retry + preview
src/features/auth/
  hooks/useAvatarUpload.ts        liga useImageUpload a POST /me/avatar/*
  components/AvatarPicker.tsx     wrapper fino sobre ImageUploadPicker
src/features/groups/
  hooks/useGroupLogoUpload.ts     liga useImageUpload a POST /groups/:groupId/logo/*
  components/GroupLogoPicker.tsx  wrapper fino sobre ImageUploadPicker
src/components/ui/ProgressBar.tsx   barra de progresso determinística (0..1), sem dependência nova
```

`AvatarPicker`/`GroupLogoPicker` existem só para escolher qual hook chamar
— toda a lógica (estado, validação, progresso, retry) vive uma única vez em
`useImageUpload`/`ImageUploadPicker`. Adicionar um terceiro uso futuro
(ex.: foto de capa de um evento) significa escrever um hook de wiring fino
igual aos dois já existentes, não duplicar a máquina de estados.

## FLUXO

Exatamente as quatro etapas pedidas, implementadas em `useImageUpload`:

```text
1. requestUploadUrl({ contentType, contentLength })  -> POST .../upload-url  (autorização + URL assinada)
2. uploadFileToPresignedUrl(uploadUrl, uri, contentType)  -> PUT direto no R2, nunca pela API
3. confirmUpload({ key })                             -> POST .../confirm   (conforme contrato da API)
4. o hook de wiring atualiza o cache do TanStack Query com o recurso retornado
```

`useAvatarUpload`/`useGroupLogoUpload` só implementam os passos 1, 3 e 4
(as duas chamadas de API + onde guardar o resultado); os passos 2 e a
orquestração inteira (ordem, estados, erro por etapa) são de
`useImageUpload`, reaproveitados sem alteração.

### Picker

`pickImage()` (`utils/pick-image.ts`) usa
`ImagePicker.launchImageLibraryAsync` (galeria, recorte quadrado,
`quality: 0.8`) — sem captura por câmera nesta primeira versão. Pede
permissão explicitamente antes (`requestMediaLibraryPermissionsAsync`) para
poder diferenciar "usuário cancelou" de "permissão negada" e mostrar a
mensagem certa em cada caso. O tamanho do arquivo nunca vem de
`ImagePickerAsset.fileSize` (a própria documentação do Expo diz que pode
estar ausente) — vem de `new File(asset.uri).size`
(`expo-file-system`), lido do arquivo real já recortado/comprimido, a
mesma coisa que será de fato enviada.

### Validar no app (tamanho; tipo) — mas a API é quem decide de verdade

`validatePickedImage` (`utils/image-upload-policy.ts`) espelha os mesmos
limites do `gestaofut-api` (`image/jpeg`/`image/png`/`image/webp`, até
5MB) só para dar feedback imediato sem gastar uma URL presigned num arquivo
que já se sabe inválido. **Isso nunca é a validação real** — mesmo que
esse espelho fique desatualizado ou seja contornado, `ConfirmXUploadUseCase`
no `gestaofut-api` relê o objeto realmente armazenado no R2
(`headObject`) e rejeita de novo se necessário (ver `docs/storage.md`
desse repositório, "Nunca confiar somente no Content-Type do cliente"). O
app confia na API como última palavra em ambos os lados dessa validação.

### Upload direto (nunca pela API)

`uploadFileToPresignedUrl` usa a API "next" do `expo-file-system`
(`new File(uri).createUploadTask(url, { httpMethod: 'PUT', headers:
{ 'Content-Type': contentType }, onProgress })`) — upload binário (não
multipart), exatamente o que uma URL presigned de PUT do S3/R2 espera. Os
bytes do arquivo vão direto do dispositivo para o R2; nenhum deles passa
pela API nem por este processo em memória como um todo (o upload é feito
via streaming nativo).

### Confirmar conforme contrato da API

`confirmUpload({ key })` chama `POST .../confirm` com **só** a `key` que a
API devolveu no passo 1 — nunca um `filename`, nunca `contentType`/
`contentLength` de novo (o servidor já os revalida sozinho a partir do que
foi de fato armazenado). A resposta é o recurso atualizado inteiro (`User`
com `avatarUrl`, ou `Group` com `logoUrl`), gravado diretamente no cache do
TanStack Query (`queryClient.setQueryData`) pelo hook de wiring — nenhuma
tela precisa re-buscar nada manualmente para ver a imagem nova.

## USOS INICIAIS

```text
avatar          AvatarPicker em MoreScreen (cartão do próprio usuário)         gate: autenticado
logo do grupo   GroupLogoPicker em GroupSettingsScreen (quando autorizado)      gate: group.update
```

**"logo do grupo quando autorizado"**: `GroupSettingsScreen` só renderiza o
`GroupLogoPicker` (a versão tocável) quando `can('group.update')` — o mesmo
booleano que já desabilita os campos de texto da tela. Sem essa permission,
o logo aparece como um `Avatar` simples, sem nenhum affordance de toque.
Essa checagem é só UX — o gate real é o `403` do `POST
.../logo/upload-url`/`.../logo/confirm` no `gestaofut-api`
(`requireGroupAccess('group.update')`), a mesma convenção já documentada em
[state-management.md](state-management.md) para toda tela deste app.

## UX

| Requisito | Implementação |
| --- | --- |
| Progresso | `ProgressBar` (`src/components/ui/`), alimentada por `useImageUpload().progress` (0 a 1, atualizado pelo `onProgress` do `UploadTask`) |
| Erro | `useImageUpload().errorMessage` — mensagem específica por etapa: permissão negada, validação client-side, falha de rede no upload ("verifique sua conexão"), ou `getApiErrorMessage` para uma falha de API (passo 1 ou 3) |
| Retry | `useImageUpload().retry()` — reenvia a mesma imagem já escolhida quando havia uma válida (`canRetrySameImage`); reabre o picker quando o erro foi de permissão/validação (não há imagem válida para reenviar) |
| Preview | `useImageUpload().previewUri` — o `uri` local da imagem escolhida, mostrado imediatamente no lugar da imagem atual, antes mesmo do upload começar |

Nenhuma credencial R2 é armazenada no app — nem em `SecureStore`, nem em
memória além da URL já assinada retornada pela API para aquele upload
específico (curta duração, um único objeto).

## Limitações conhecidas do contrato atual

- **Sem captura por câmera** — só galeria (`launchImageLibraryAsync`).
- **Sem cancelamento de upload em progresso** — `UploadTask.cancel()`
  existe no `expo-file-system`, mas não está exposto por `useImageUpload`
  nesta primeira versão.
- **Sem fila/retomada em segundo plano** — se o app for para background
  durante o upload, o comportamento depende do SO/`expo-file-system`
  (`sessionType` no iOS), não é gerenciado explicitamente aqui.
