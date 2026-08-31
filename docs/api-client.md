# Cliente HTTP

## Configuração

Única variável pública: `EXPO_PUBLIC_API_URL` (origem da API, sem path —
ex.: `http://localhost:3000`). Validada em `src/services/api/env.ts` com Zod
no carregamento do módulo; se estiver ausente ou inválida, lança um erro
imediato e legível em vez de deixar o app tentar chamadas para `undefined`.

`API_BASE_URL` (`${API_ORIGIN}/api/v1`) é derivada internamente, não vem de
env — o prefixo de versão é um detalhe de contrato da API, não configuração
de ambiente.

**Nunca** adicionar uma chave sensível com prefixo `EXPO_PUBLIC_*`: qualquer
variável assim é embutida no binário e fica legível por quem inspecionar o
app.

## `apiFetch` (`src/services/api/client.ts`)

Cliente único para os endpoints versionados (`/api/v1/...`):

- **Authorization**: injeta `Bearer <accessToken>` lendo
  `useAuthStore.getState().accessToken` (a menos que `auth: false` seja
  passado — usado por `/auth/register`, `/auth/login`, `/auth/refresh`, que
  não levam bearer).
- **Timeout**: `AbortController` interno, default 10s (`timeoutMs`).
- **Cancelamento**: aceita um `signal` externo (ex.: o do `queryFn` do
  TanStack Query) e o combina com o timeout interno.
- **Refresh automático em 401**: se uma requisição feita com `auth: true`
  recebe `401`, o client chama `refreshAccessToken()`
  (`src/services/api/token-refresh.ts`) e repete a requisição original
  **uma única vez** com o novo access token — nunca duas vezes (a segunda
  tentativa, se também vier `401`, segue para o erro normalmente, sem
  loop). Chamadas concorrentes que caem em 401 ao mesmo tempo compartilham
  a mesma promise de refresh (`refreshAccessToken` deduplica), então uma
  rajada de requisições nunca dispara mais de um `POST /auth/refresh`. Se o
  próprio refresh falhar, `token-refresh.ts` já limpa a sessão local
  (`signOut()` + apaga o refresh token do SecureStore) antes do erro
  propagar — nenhuma tela precisa tratar "sessão expirada" manualmente.
  Um `401` em uma requisição com `auth: false` (ex.: senha errada no
  login) nunca aciona esse fluxo — é apenas um erro de negócio normal.
- **Erros padronizados**: qualquer falha vira `ApiError` (`status`, `code`,
  `details`) — nunca um erro cru de `fetch` ou um `Response` não tratado. O
  `code` é mapeado a partir do corpo `{ error: { code, message } }` que o
  `gestaofut-api` já retorna (ver o error handler desse repositório).

```ts
import { apiFetch } from '@/services/api/client';

const group = await apiFetch<Group>(`/groups/${id}`, { signal });
```

## Endpoints (`src/services/api/endpoints/`)

Cada arquivo agrupa as chamadas de um recurso: `system.ts` (`getHealth()`),
`auth.ts` (`register`, `login`, `refresh`, `logout`, `getMe`),
`organizations.ts`, `groups.ts` e `matches.ts` (`listMatches`, `getMatch`,
`listMatchParticipants`, `confirmMatchParticipant`,
`declineMatchParticipant`, `cancelMatchParticipant` — ver
[matches.md](matches.md)) — tipos espelham exatamente o contrato OpenAPI do
`gestaofut-api`, sem campo inventado. `getHealth()` é a exceção que
confirma a regra: chama `/health` diretamente (sem
`apiFetch`/`API_BASE_URL`/auth), porque é um endpoint operacional do
`gestaofut-api`, não de negócio.

Ao adicionar um recurso real, o padrão é:

```ts
// src/services/api/endpoints/<recurso>.ts
export async function getGroup(id: string, signal?: AbortSignal) {
  return apiFetch<Group>(`/groups/${id}`, { signal });
}
```

e um hook de feature consumindo via `useQuery`/`useMutation` — nunca chamar
`apiFetch` diretamente de uma screen.

## Erros (`src/services/api/errors.ts`)

`ApiError` cobre: `NETWORK_ERROR`, `TIMEOUT`, `CANCELLED`, mais os códigos que
o backend já define (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`,
`NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`) e um `UNKNOWN_ERROR` de
fallback. Uma tela deve tratar `ApiError`, nunca inspecionar `Response`.
