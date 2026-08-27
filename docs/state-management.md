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

## 2. Zustand — estado local global

`src/store/auth-store.ts` é o único store hoje: guarda **apenas**
`{ status, token }` — a sessão do próprio app, não um cache de dados do
servidor. Regra dura: **dado que vem da API vive no TanStack Query, nunca no
Zustand**. Um store novo só se justifica para estado que é genuinamente do
cliente (preferências de UI, flags de onboarding, sessão) — não para
espelhar uma resposta de rede.

## 3. Expo SecureStore — persistência sensível

`src/services/secure-storage.ts` encapsula `expo-secure-store`. É o único
lugar por onde o **refresh token** passa para ser persistido entre sessões
do app — nunca `AsyncStorage`, nunca `zustand/persist`, nunca um arquivo
comum. O **access token** vive só em memória, em `useAuthStore.accessToken`
(nunca é escrito em disco); é ele que o cliente HTTP injeta como
`Authorization: Bearer` (ver [api-client.md](api-client.md)).

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
  → deleteSecureItem(SECURE_KEYS.refreshToken)
  → useAuthStore.getState().signOut()
  → queryClient.clear() (nenhum dado do usuário anterior fica em cache)
```

## Autorização continua no backend

Nada aqui decide *permissão* — `status: 'authenticated'` só controla qual
grupo de rotas é exibido no cliente. Qualquer verificação de "o usuário pode
fazer X" deve ser respondida pela API (`gestaofut-api`), nunca inferida de um
campo local (ex.: um "role" guardado no Zustand). Ver
`docs/security.md`/`docs/architecture.md` do `gestaofut-api` para o
racional de multi-tenancy e IDOR.
