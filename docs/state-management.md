# Gerenciamento de estado

Três camadas com responsabilidades que não se sobrepõem:

## 1. TanStack Query — dados remotos

`src/services/api/query-client.ts` exporta o `QueryClient` único do app
(`retry: 1`, `staleTime: 30s`, `gcTime: 5min`). Toda chamada de rede que
alimenta a UI passa por um hook `useQuery`/`useMutation`, nunca por
`useState` + `useEffect` manual.

Query keys são centralizadas em `src/services/api/query-keys.ts`
(`queryKeys.system.health`, etc.) — novas features devem estender esse
objeto em vez de inventar arrays soltos, para manter invalidação previsível.

Exemplo real (não é feature de negócio, é a validação da própria
arquitetura): `src/features/home/hooks/useApiStatus.ts` consulta `/health`
do `gestaofut-api` e `HomeScreen` reage a `isPending`/`isError`/`data`.

### Feedback instantâneo em mutations de baixa latência esperada

A maioria das mutations do app só chama `invalidateQueries` no `onSuccess`
(ver `useGroupMembers.ts`) — o padrão padrão, suficiente quando um pequeno
atraso até o refetch terminar não importa para a UX. As mutations de
confirmação de presença (`src/features/matches/hooks/useMatchParticipants.ts`)
são a exceção deliberada: além de invalidar, elas também aplicam
`queryClient.setQueryData` imediatamente com a resposta já autoritativa do
servidor, substituindo a entrada correspondente na lista em cache. Isso
existe porque confirmar presença é descrito como "abrir o app e confirmar
em poucos segundos" — esperar um round-trip de refetch depois de já ter a
resposta em mãos seria um atraso perceptível e desnecessário. O
`invalidateQueries` continua rodando depois, como reconciliação de fundo,
não como o caminho principal de feedback.

`useMonthlyFees`/`useCharges` (`finance`, ver [finance.md](finance.md))
seguem esse mesmo padrão de `setQueryData` para waive/cancel (uma
transição simples de um item já em cache). Mas
`useRecordManualPayment` — que pode quitar tanto uma mensalidade quanto
uma cobrança, e ambas alimentam o mesmo dashboard agregado — volta ao
padrão padrão de só invalidar: um pagamento manual não é uma ação de
"poucos segundos" no mesmo sentido crítico de confirmar presença, e
patchar manualmente todas as árvores de cache que um pagamento pode
afetar seria mais frágil do que deixar um refetch reconciliar tudo de
uma vez.

## 2. Zustand — estado local global

Dois stores hoje, cada um guardando **apenas** estado genuinamente do
cliente — nunca um cache de dados do servidor (regra dura: **dado que vem
da API vive no TanStack Query, nunca no Zustand**):

- `src/store/auth-store.ts` — `{ status, accessToken }`, a sessão do app.
- `src/store/group-store.ts` — `{ activeGroupId, activeOrganizationId }`, o
  grupo ao qual o app está "escopado" no momento. É o equivalente a um
  "GroupContext": implementado como Zustand (não React Context) para ficar
  consistente com `auth-store` — ver [multi-tenancy.md](multi-tenancy.md).
  **Isso nunca é autorização** — é só um ponteiro de conveniência para saber
  qual `groupId`/`organizationId` usar nas chamadas de API; quem decide o
  que o usuário pode fazer com esse grupo é sempre a API (403 se a
  permission real não bater).

Um store novo só se justifica para estado que é genuinamente do cliente
(preferências de UI, flags de onboarding, sessão, seleção ativa) — não para
espelhar uma resposta de rede.

## 3. Expo SecureStore — persistência sensível

`src/services/secure-storage.ts` encapsula `expo-secure-store`. É o único
lugar por onde o **refresh token** passa para ser persistido entre sessões
do app — nunca `AsyncStorage`, nunca `zustand/persist`, nunca um arquivo
comum. O **access token** vive só em memória, em `useAuthStore.accessToken`
(nunca é escrito em disco); é ele que o cliente HTTP injeta como
`Authorization: Bearer` (ver [api-client.md](api-client.md)). O último
`activeGroupId` (ver `group-store.ts` acima) também passa por aqui — não
porque o id de um grupo seja sensível, mas para reaproveitar o único ponto
de persistência que o projeto já tem, em vez de introduzir `AsyncStorage`
só para essa conveniência.

Fluxo real (`gestaofut-api` já expõe `/auth/*` e `/me`, ver
[navigation.md](navigation.md)):

```text
LoginScreen.onSubmit
  → POST /auth/login
  → setSecureItem(SECURE_KEYS.refreshToken, refreshToken)  (persiste)
  → useAuthStore.getState().signIn(accessToken)             (memória, síncrono)
  → router.replace('/(app)')

App start (src/hooks/useBootstrapAuth.ts)
  → getSecureItem(SECURE_KEYS.refreshToken)
  → sem token → useAuthStore.getState().signOut()  (status: unauthenticated)
  → com token → refreshAccessToken() (POST /auth/refresh; valida e renova
    em uma única chamada — não há um endpoint separado de "só validar")
    → sucesso → signIn(novoAccessToken) + persiste o refreshToken rotacionado
    → falha explícita da API (401) → limpa o SecureStore + signOut()
    → falha de rede → apenas signOut() para esta sessão do app; o
      refreshToken persistido não é apagado, para uma próxima tentativa

Logout (src/features/auth/hooks/useLogout.ts)
  → POST /auth/logout (best-effort — falha de rede não bloqueia o logout local)
  → deleteSecureItem(SECURE_KEYS.refreshToken) + deleteSecureItem(SECURE_KEYS.activeGroupId)
  → useAuthStore.getState().signOut() + useGroupStore.getState().clearActiveGroup()
  → queryClient.clear() (nenhum dado do usuário/grupo anterior fica em cache)

Seleção de grupo (src/features/groups/ — ver multi-tenancy.md)
  → após autenticado, GroupGateScreen resolve o grupo ativo:
    0 grupos e sem permissão em nenhuma organização → tela vazia
    0 grupos mas pode criar → tela de criação
    1 grupo → seleciona automaticamente, sem perguntar
    >1 grupos, sem ponteiro persistido válido → tela de seleção
  → em qualquer caso: useGroupStore.getState().setActiveGroup(groupId, organizationId)
    + setSecureItem(SECURE_KEYS.activeGroupId, groupId)
```

## Autorização continua no backend

Nada aqui decide _permissão_. `status: 'authenticated'` só controla qual
grupo de rotas é exibido no cliente, e `activeGroupId`/`activeOrganizationId`
só dizem qual grupo está "selecionado" — nunca o que o usuário pode fazer
com ele. Para gating de UI (esconder uma tab, desabilitar um botão), o app
usa um **espelho local, não-autoritativo**, do mapa role → permission do
`gestaofut-api` (`src/features/groups/utils/permissions.ts`, com a role real
obtida via `GET /organizations/:id/members`) — mas qualquer ação que muda
dado sempre passa pela API de verdade, que responde `403` se a permission
real não bater, mesmo que esse espelho local diga o contrário (cliente
desatualizado, adulterado, etc.). Ver `docs/security.md` e
`docs/multi-tenancy.md` do `gestaofut-api` para o racional de multi-tenancy,
RBAC e IDOR.
