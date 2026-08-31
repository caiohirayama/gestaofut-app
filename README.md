# GestãoFut App

Aplicativo móvel (iOS/Android) do GestãoFut — plataforma de gestão de grupos
esportivos recorrentes. Já implementados: autenticação real contra o
`gestaofut-api` (registro, login, refresh automático, logout — ver
[docs/api-client.md](docs/api-client.md)), o núcleo de organizações/grupos
(seleção e criação de grupo, configurações básicas, membros, tabs
dinâmicas por permission — ver [docs/multi-tenancy.md](docs/multi-tenancy.md))
e jogos (próximo jogo em destaque na Home, lista/histórico, detalhes,
confirmação de presença, entrada self-service de avulsos com fila de
espera e ofertas de vaga com contador, e painel administrativo com fila/
ordem/ofertas ativas — ver [docs/matches.md](docs/matches.md)). Financeiro,
eventos e notificações push ainda não existem, mas a rota
`/matches/{matchId}` já está preparada como alvo de um deep link futuro.
Veja [docs/architecture.md](docs/architecture.md) para o que vem a seguir.

## Stack

- React Native (Expo SDK 57) + TypeScript
- Expo Router (navegação por arquivos)
- TanStack Query (dados remotos)
- Zustand (estado local global)
- React Hook Form + Zod (formulários e validação)
- Expo SecureStore (tokens sensíveis)
- pnpm

Apenas iOS e Android — sem web/PWA/Next.js.

## Pré-requisitos

- Node.js 24+
- pnpm 9+
- Xcode (iOS, macOS apenas) e/ou Android Studio (Android)
- `gestaofut-api` rodando localmente (ver o README desse repositório) —
  `EXPO_PUBLIC_API_URL` deve apontar para ele.

## Quick start

```bash
cp .env.example .env
pnpm install

pnpm start          # abre o Metro / Expo Dev Tools
pnpm android        # abre no emulador/dispositivo Android
pnpm ios            # abre no simulador iOS (macOS apenas)
```

O app inicia na tela de login/cadastro. Após autenticar, resolve o grupo
ativo automaticamente (seleciona se só houver um, oferece criar o primeiro
se for um usuário novo, ou pede para escolher entre vários) e então mostra
a shell de tabs (`Início / Jogos / Jogadores / Financeiro / Mais`, cada uma
aparecendo ou não conforme as permissions do usuário nesse grupo).

## Scripts

| Script           | Descrição                                    |
| ---------------- | -------------------------------------------- |
| `pnpm start`     | Inicia o Metro bundler                       |
| `pnpm android`   | Abre no Android                              |
| `pnpm ios`       | Abre no iOS (macOS apenas)                   |
| `pnpm lint`      | ESLint (`expo lint`)                         |
| `pnpm typecheck` | `tsc --noEmit`                               |
| `pnpm test`      | Testes (Jest + React Native Testing Library) |
| `pnpm format`    | Prettier `--write`                           |

## Documentação

- [docs/architecture.md](docs/architecture.md) — estrutura de pastas e regras de dependência
- [docs/navigation.md](docs/navigation.md) — Expo Router, grupos de rota, tabs dinâmicas
- [docs/multi-tenancy.md](docs/multi-tenancy.md) — organizations, grupos, permissions, GroupContext
- [docs/design-system.md](docs/design-system.md) — componentes base e tokens visuais
- [docs/state-management.md](docs/state-management.md) — TanStack Query vs. Zustand vs. SecureStore
- [docs/api-client.md](docs/api-client.md) — cliente HTTP, erros, query keys, refresh automático
- [docs/development.md](docs/development.md) — ambiente, testes, como adicionar uma feature
