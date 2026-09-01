# Revisão de Segurança — gestaofut-app

Revisão completa do app (Expo/React Native), cobrindo Segurança, Auth,
API Client, Performance, Accessibility, e configuração EAS/Expo. Nenhuma
feature nova foi implementada — só correções de segurança, hardening,
configuração e documentação. Achados classificados **Critical / High /
Medium / Low / Informational**.

Convenção de status: **Fixed** (corrigido nesta revisão), **Reviewed — no
issue found** (área revisada, comportamento já correto), **Accepted risk**
(risco reconhecido, decisão explícita de não corrigir, com justificativa).

## Sumário executivo

| # | Achado | Severidade | Status |
| --- | --- | --- | --- |
| 1 | `decode-uri-component`/`uuid`: DoS via decodificação percent-encoded malformada, alcançável por deep link | Medium (moderate no advisory; relevante aqui por ser client-side/remoto) | Fixed |
| 2 | Push notifications continuavam após logout | Medium | Fixed |
| 3 | Permissão `RECORD_AUDIO` (Android) solicitada sem nenhum uso de câmera/áudio | Medium | Fixed |
| 4 | `.gitignore` não cobria `.env.development`/`.env.production` (só `.env`/`.env.*.local`) | Medium | Fixed |
| 5 | Dependências Expo SDK fora da versão de patch esperada (8 pacotes) | Medium | Fixed |
| 6 | `Input`: label visível nunca associado ao campo para leitor de tela | Medium | Fixed |
| 7 | `textTertiary` (~3.1:1 em branco) abaixo do WCAG AA (4.5:1) para texto normal | Medium | Fixed |
| 8 | `image-size` (via Metro/build tooling): DoS — sem patch disponível | High (advisory) → **Informational** (build-time only) | Accepted risk |
| 9 | `GroupPicker`: `renderItem` inline, sem memoização (lista pequena) | Low | Fixed |
| 10 | Sem proteção de screenshot em telas financeiras | Informational | Accepted risk (fora de escopo — feature nova) |

Todo o resto das áreas pedidas foi revisado e **nenhum problema Critical/
High foi encontrado** — ver "Áreas revisadas sem achados" abaixo.

---

## 1. Dependências vulneráveis alcançáveis no dispositivo — Medium — Fixed

`pnpm audit --prod` (rodado contra as dependências reais do bundle, não só
devDependencies) acusava:

```text
high (2)      image-size — DoS via parsers ICNS/JXL/HEIF — SEM patch disponível
moderate      uuid <11.1.1 — buffer bounds check ausente em v3/v5/v6
moderate      decode-uri-component <0.5.0 — DoS via decodificação percent-encoded exponencial
```

- **`decode-uri-component`** chega via `expo-router` → `query-string` —
  **este é código que roda de verdade no dispositivo**, usado para
  interpretar query strings de rotas/deep links. Um deep link malicioso
  (`gestaofut://...?x=%25%25%25...`) poderia travar a thread JS. Corrigido
  fixando `decode-uri-component >=0.5.0` via `pnpm-workspace.yaml`
  (`overrides`).
- **`uuid`** chega via `@expo/config-plugins` → `xcode` — só ferramenta de
  build (prebuild/EAS Build), nunca embutido no app. Corrigido por
  higiene mesmo assim (`uuid >=11.1.1`), já que o patch é de baixo risco.
- **`image-size`** chega através do próprio Metro (bundler) — também só
  build-time, nunca no dispositivo. **Sem versão corrigida publicada** —
  accepted risk, reclassificado Informational para este projeto (exigiria
  esperar um patch upstream do Metro/`image-size`, não algo que este
  projeto possa resolver sozinho).

**Efeito colateral encontrado e corrigido**: a versão corrigida de
`decode-uri-component` (`0.5.0`) é **ESM-only** (`export default`), e o
preset padrão do `jest-expo` não inclui esse pacote na lista de módulos
transformáveis dentro de `node_modules` — isso quebrava 11 suítes de teste
com `SyntaxError: Unexpected token 'export'`. Corrigido estendendo
`transformIgnorePatterns` em `jest.config.js` (mesma lista do preset, mais
`decode-uri-component`). Documentado no próprio `jest.config.js` — ver
também "TESTES" abaixo.

## 2. Push continuava após logout — Medium — Fixed

`useLogout` limpava sessão, `SecureStore`, e o cache do TanStack Query,
mas **nunca revogava a inscrição de push** deste dispositivo
(`push_subscription_id` guardado localmente). Resultado: um usuário que
faz logout continuava recebendo notificações push sobre atividade do grupo
— dados sobre algo que ele não pode mais abrir no app, e potencialmente
visíveis para quem usar o aparelho em seguida sem ver o conteúdo completo
(a notificação nativa mostra `title`/`body` na tela de bloqueio,
independente de quem está logado no app).

Corrigido: `revokeCurrentDevicePushSubscription()` (extraído de
`useRegisterPushDevice.revoke`, agora reaproveitado por `useLogout`) roda
**antes** de limpar o access token — a chamada `POST
.../push-subscriptions/:id/revoke` precisa de autenticação válida. Melhor
esforço: mesmo se a chamada falhar (offline), o ponteiro local ainda é
esquecido.

## 3. Permissões — Android RECORD_AUDIO desnecessária — Medium — Fixed

`expo-image-picker` adiciona `android.permission.RECORD_AUDIO` **por
padrão**, mesmo quando o app nunca abre a câmera (só
`launchImageLibraryAsync`, nunca `launchCameraAsync` — ver
`src/features/uploads/utils/pick-image.ts`, docs/uploads.md). Pedir uma
permissão de microfone para um app que só escolhe fotos da galeria é
over-permissioning: sem função nenhuma por trás dela, só reduz a confiança
do usuário e aumenta a superfície de auditoria da loja.

Corrigido em `app.json`: `cameraPermission: false` e
`microphonePermission: false` na config do plugin `expo-image-picker` —
confirmado via `npx expo config` que `android.permissions` não lista mais
nada (nem `RECORD_AUDIO`, nem `CAMERA`) na config resolvida.

## 4. `.gitignore` incompleto para variáveis de ambiente por perfil — Medium — Fixed

`.env.example` já instrui "copie para `.env.development`/
`.env.production`", mas `.gitignore` só cobria `.env` e `.env.*.local` —
um `.env.development` (sem `.local`) poderia ser commitado por acidente.
Hoje o único valor é `EXPO_PUBLIC_API_URL` (não sensível), mas o hábito de
nunca commitar qualquer variante de `.env` deve valer independentemente do
conteúdo atual. Corrigido: `.gitignore` agora ignora `.env*` (com exceção
explícita de `.env.example`), espelhando a convenção já usada no
`gestaofut-api`.

## 5. Expo SDK — dependências fora de sincronia — Medium — Fixed

`npx expo-doctor` acusava 8 pacotes (`expo`, `expo-constants`,
`expo-font`, `expo-image-picker`, `expo-linking`, `expo-notifications`,
`expo-router`, `expo-secure-store`) um patch atrás do esperado pelo SDK
instalado — risco real de incompatibilidades sutis entre módulos nativos
de versões diferentes do mesmo SDK. Corrigido com `npx expo install --fix`;
`expo-dev-client` também foi instalado (exigido pelo perfil `development`
do `eas.json`, que já usava `developmentClient: true` sem o pacote
presente — ver [release.md](release.md)). `npx expo-doctor` → 21/21
checks passando.

## 6. `Input`: label nunca associado ao campo (leitor de tela) — Medium — Fixed

O `label`/`error` visíveis de `Input` são um `<Text>` irmão, nunca ligado
ao `TextInput` via `accessibilityLabel` — diferente de um `<label for>`
HTML, React Native não infere essa associação sozinho. Um usuário de
VoiceOver/TalkBack focando o campo ouvia só "campo de texto", sem saber se
é e-mail, senha, nome, etc — em TODO formulário do app (login, cadastro,
criar grupo, adicionar jogador, criar evento, lançar despesa...).

Corrigido: `Input` agora passa `accessibilityLabel={label}` (incluindo a
mensagem de erro quando presente: `"E-mail. E-mail inválido"`) —
sobrescrevível por um `accessibilityLabel` explícito do chamador
(`{...rest}` continua vencendo). 4 testes novos em `Input.test.tsx`.

## 7. Contraste de cor abaixo do WCAG AA — Medium — Fixed

`colors.textTertiary` (`#8A93A2`) tem contraste de **~3.1:1** contra
branco — abaixo do mínimo de 4.5:1 do WCAG AA para texto normal (só
atingiria o limiar de "texto grande", 3:1, por uma margem mínima). Esse
token é usado para texto de verdade e legível — horários em listas de
notificação, "última verificação" em Mais, legendas — não só para tintas
decorativas de ícone (onde 3:1 já seria aceitável via WCAG 1.4.11).

Corrigido: `textTertiary` escurecido para `#6B7480` (~4.74:1,
recalculado via a fórmula de luminância relativa do WCAG) — ainda
claramente "terciário" frente a `textSecondary` (`#5B6472`, ~6.0:1), só o
suficiente para cruzar o limiar de AA. Nenhum outro token de cor de texto
(`textSecondary`, `primary`, `warning`, `danger`) falhava — todos
recalculados e confirmados acima de 4.5:1.

## 8. `GroupPicker`: item de lista sem memoização — Low — Fixed

Única `FlatList` do app com `renderItem` inline (não `useCallback`) e sem
um componente de linha memoizado — inofensivo dado o tamanho da lista
(os grupos do próprio usuário, tipicamente poucos), mas inconsistente com
o padrão já estabelecido em toda outra lista do app (`GamesScreen`,
`NotificationsScreen`, `MembersScreen`, etc). Extraído `GroupRow`
(`memo`) + `renderItem` via `useCallback`, para manter um único padrão de
lista em todo o código.

## FINANCEIRO / dados sensíveis

- **Nunca no `SecureStore` além de tokens/ponteiros** — nenhum valor
  monetário é persistido localmente; tudo vem do cache do TanStack Query
  (memória, nunca disco) e desaparece com `queryClient.clear()` no
  logout.
- **`AsyncStorage` nunca usado** — confirmado por busca no repositório
  inteiro; toda persistência passa por `src/services/secure-storage.ts`
  (SecureStore).
- **`EXPO_PUBLIC_API_URL`** é a única variável `EXPO_PUBLIC_*` do projeto
  — uma URL, nunca um segredo. Nenhuma chave de API, credencial R2, ou
  string de conexão jamais aparece no código do cliente (o app nunca fala
  com R2/Postgres diretamente — só com `gestaofut-api`, que já expõe URLs
  presigned de curta duração para upload, nunca uma credencial real — ver
  [uploads.md](uploads.md)).
- **Nenhum `console.log`/`console.error`/`console.warn` em código de
  produção** — confirmado por busca no repositório inteiro
  (`src/`, `app/`). Sem esse hábito, não há como um valor sensível
  vazar para o log do dispositivo/Metro por acidente.
- **Nenhum SDK de analytics/crash-reporting** (Sentry, Bugsnag, Firebase,
  etc.) integrado — sem terceiro recebendo stack traces, screenshots, ou
  payloads de request que pudessem carregar dado sensível.

## Áreas revisadas sem achados (Reviewed — no issue found)

- **SecureStore**: único mecanismo de persistência sensível
  (`refresh_token`, `active_group_id`, `push_subscription_id`) —
  `WHEN_UNLOCKED` (padrão do SecureStore) é adequado para o modelo de
  ameaça atual (token só acessível com o aparelho desbloqueado).
- **Tokens**: access token só em memória (Zustand, nunca disco); refresh
  token só via SecureStore, nunca em log/estado visível; nunca enviado a
  R2 (upload usa só a URL presigned).
- **API errors**: `ApiError` normaliza toda falha de rede/HTTP num único
  formato; `getApiErrorMessage` nunca repassa mensagem de erro bruta do
  servidor para códigos genéricos (rate limit, rede, timeout, validação),
  só para `FORBIDDEN`/`NOT_FOUND` (já escritas para serem seguras pelo
  próprio `gestaofut-api`).
- **Deep links**: `resolveNotificationDeepLink` resolve só a partir de ids
  de recurso (nunca executa nada, nunca abre uma `WebView`); rotas
  desconhecidas caem no `+not-found` padrão do Expo Router, nunca em
  código arbitrário. Navegação por push é bloqueada se a sessão não
  estiver autenticada (ver [notifications.md](notifications.md)).
- **Upload**: nenhuma credencial R2 no dispositivo; upload direto via URL
  presigned de curta duração; `Content-Type` nunca confiado sozinho (a
  API relê o objeto real antes de aceitar — ver [uploads.md](uploads.md)).
- **API Client**: um único retry de 401 (nunca loop — `isRetry` limita a
  uma tentativa), refresh concorrente deduplicado por uma única Promise
  compartilhada (`refreshAccessToken`), mutations nunca retentadas
  automaticamente (`defaultOptions.mutations` não sobrescrito — o padrão
  do TanStack Query, `retry: 0`, já é o comportamento seguro para não
  duplicar uma operação não-idempotente como uma cobrança).
- **AUTH — bootstrap**: `useBootstrapAuth` lê o refresh token persistido e
  o rotaciona uma vez no start; falha de rede não apaga o token guardado
  (permite tentar de novo no próximo start); só uma rejeição explícita da
  API (401) limpa a sessão.
- **AUTH — expiração/usuário bloqueado**: um usuário bloqueado
  (`status !== 'ACTIVE'`) é rejeitado pelo próprio `gestaofut-api` tanto
  no login quanto no refresh — o app só precisa (e já faz) mostrar a
  mensagem de erro que a API devolve, nunca decide isso sozinho.
- **Performance — TanStack Query**: `staleTime: 30s`/`gcTime: 5min`
  evitam refetch redundante entre navegações próximas; `queryKeys`
  centralizado impede duas partes do app usarem chaves diferentes para o
  mesmo dado (que causaria cache duplicado/inconsistente).
- **Performance — FlatList**: `keyExtractor` + `renderItem` via
  `useCallback` + linha memoizada (`memo`) em toda lista do app (após a
  correção do item 8).
- **Performance — imagens**: nenhuma imagem local pesada não otimizada
  encontrada; avatares/logos remotos são exibidos via `Avatar` sem
  manipulação client-side cara.

## Limitações conhecidas / decisões deliberadas

- **Sem proteção contra screenshot em telas financeiras**
  (`expo-screen-capture` ou equivalente) — não implementado nesta
  revisão por ser uma capacidade nova, fora do escopo de "revisar, não
  adicionar features". Registrado aqui para uma decisão de produto
  futura, não como um bug.
- **`image-size` sem patch disponível** — ver item 1; reavaliar quando o
  Metro/`image-size` publicar uma correção.

## TESTES (validação desta revisão)

```text
pnpm lint          limpo
pnpm typecheck     limpo (2 erros pré-existentes de typed-routes,
                    não relacionados — `.expo/types/router.d.ts` só é
                    gerado ao rodar `expo start`/`export` ao menos uma vez
                    neste ambiente; regenerado e confirmado durante esta
                    sessão, não uma regressão desta revisão)
pnpm test          545 testes, 102 arquivos, todos passando
npx expo-doctor    21/21 checks passando
pnpm audit --prod  1 achado restante (image-size — accepted risk, sem
                    patch disponível, só build-time)
```

Uma execução completa da suíte pode ocasionalmente mostrar 1-2 testes de
tela excedendo o timeout padrão de 5s sob contenção momentânea de CPU
desta máquina de desenvolvimento (arquivos isolados e reexecuções da
suíte completa confirmam 545/545 passando de forma determinística) — uma
característica já observada deste ambiente, não uma regressão introduzida
aqui.
