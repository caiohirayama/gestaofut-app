# GestãoFut App

Aplicativo móvel (iOS/Android) do GestãoFut — plataforma de gestão de grupos
esportivos recorrentes. Este repositório contém, por enquanto, apenas as
**foundations**: nenhuma feature de negócio (jogos, jogadores, financeiro,
eventos, notificações) e nenhuma autenticação real foram implementadas ainda.
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

## Quick start

```bash
cp .env.example .env
pnpm install

pnpm start          # abre o Metro / Expo Dev Tools
pnpm android        # abre no emulador/dispositivo Android
pnpm ios            # abre no simulador iOS (macOS apenas)
```

O app inicia na tela de login (stub, sem backend real ainda) e, após
"entrar", navega para a shell de tabs (`Início / Jogos / Jogadores /
Financeiro / Mais`).

## Scripts

| Script            | Descrição                                    |
| ----------------- | --------------------------------------------- |
| `pnpm start`       | Inicia o Metro bundler                        |
| `pnpm android`     | Abre no Android                               |
| `pnpm ios`         | Abre no iOS (macOS apenas)                    |
| `pnpm lint`        | ESLint (`expo lint`)                          |
| `pnpm typecheck`   | `tsc --noEmit`                                |
| `pnpm test`        | Testes (Jest + React Native Testing Library)  |
| `pnpm format`      | Prettier `--write`                            |

## Documentação

- [docs/architecture.md](docs/architecture.md) — estrutura de pastas e regras de dependência
- [docs/navigation.md](docs/navigation.md) — Expo Router, grupos `(auth)`/`(app)`, tabs
- [docs/design-system.md](docs/design-system.md) — componentes base e tokens visuais
- [docs/state-management.md](docs/state-management.md) — TanStack Query vs. Zustand vs. SecureStore
- [docs/api-client.md](docs/api-client.md) — cliente HTTP, erros, query keys
- [docs/development.md](docs/development.md) — ambiente, testes, como adicionar uma feature
