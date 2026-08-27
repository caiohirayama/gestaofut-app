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

- **Authorization**: injeta `Bearer <token>` lendo `useAuthStore.getState().token`
  (a menos que `auth: false` seja passado).
- **Timeout**: `AbortController` interno, default 10s (`timeoutMs`).
- **Cancelamento**: aceita um `signal` externo (ex.: o do `queryFn` do
  TanStack Query) e o combina com o timeout interno.
- **Erros padronizados**: qualquer falha vira `ApiError` (`status`, `code`,
  `details`) — nunca um erro cru de `fetch` ou um `Response` não tratado. O
  `code` é mapeado a partir do corpo `{ error: { code, message } }` que o
  `gestaofut-api` já retorna (ver o error handler desse repositório).

```ts
import { apiFetch } from '@/services/api/client';

const group = await apiFetch<Group>(`/groups/${id}`, { signal });
```

## Endpoints (`src/services/api/endpoints/`)

Cada arquivo agrupa as chamadas de um recurso (hoje só `system.ts`, com
`getHealth()`). `getHealth()` é a exceção que confirma a regra: chama
`/health` diretamente (sem `apiFetch`/`API_BASE_URL`/auth), porque é um
endpoint operacional do `gestaofut-api`, não de negócio.

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
