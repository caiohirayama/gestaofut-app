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
lugar por onde um token deve passar para ser persistido entre sessões do
app. Zustand mantém uma cópia em memória (para o cliente HTTP ler
`useAuthStore.getState().token` de forma síncrona), mas a fonte durável é
sempre o SecureStore — nunca `AsyncStorage`.

Fluxo hoje (stub, sem backend de auth ainda):

```text
LoginScreen.onSubmit
  → setSecureItem(SECURE_KEYS.authToken, token)   (persiste)
  → useAuthStore.getState().signIn(token)          (memória, síncrono)
  → router.replace('/(app)')

App start
  → useBootstrapAuth lê getSecureItem(SECURE_KEYS.authToken)
  → useAuthStore.getState().hydrate(token)
```

## Autorização continua no backend

Nada aqui decide *permissão* — `status: 'authenticated'` só controla qual
grupo de rotas é exibido no cliente. Qualquer verificação de "o usuário pode
fazer X" deve ser respondida pela API (`gestaofut-api`), nunca inferida de um
campo local (ex.: um "role" guardado no Zustand). Ver
`docs/security.md`/`docs/architecture.md` do `gestaofut-api` para o
racional de multi-tenancy e IDOR.
