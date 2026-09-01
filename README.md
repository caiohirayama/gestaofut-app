# GestãoFut App

Aplicativo móvel (iOS/Android) do GestãoFut — plataforma de gestão de grupos
esportivos recorrentes. Já implementados: autenticação real contra o
`gestaofut-api` (registro, login, refresh automático, logout — ver
[docs/api-client.md](docs/api-client.md)), o núcleo de organizações/grupos
(seleção e criação de grupo, configurações básicas, membros, tabs
dinâmicas por permission — ver [docs/multi-tenancy.md](docs/multi-tenancy.md))
jogos (próximo jogo em destaque na Home, lista/histórico, detalhes,
confirmação de presença, entrada self-service de avulsos com fila de
espera e ofertas de vaga com contador, painel administrativo com fila/
ordem/ofertas ativas, e "Compartilhar escala" — preview real da API,
copiar, e compartilhamento nativo (WhatsApp incluso quando instalado, sem
nenhuma integração própria) — ver [docs/matches.md](docs/matches.md)),
financeiro
(dashboard mensal e lista de pendências para `finance.read`/`finance.manage`,
pagamento manual com confirmação, "Meu financeiro" — mensalidade/avulsos/
pagamentos/pendências somente do próprio usuário —, e um caixa simples
(saldo atual, entradas/saídas do mês, filtro por categoria/período, "+ Nova
despesa"/"+ Novo lançamento" para `finance.manage`, sempre com
cancelamento/estorno confirmado — nunca um delete — ver
[docs/finance.md](docs/finance.md)) e eventos (churrasco e outros tipos
genéricos — evento em destaque na Home, lista/histórico, confirmação de
presença, "Incluso na mensalidade" para quem tem direito ao benefício, e
administração completa — criar/editar/avançar status/cancelar/visualizar
participantes — ver [docs/events.md](docs/events.md)) e upload de imagens
(avatar do próprio usuário, logo do grupo quando autorizado — picker do
Expo, upload direto para o Cloudflare R2 via URL presigned, progresso/erro/
retry/preview, nenhuma credencial R2 armazenada no app — ver
[docs/uploads.md](docs/uploads.md)) e notificações (push via Expo
Notifications — pedido de permissão contextual dentro da própria central,
nunca na primeira tela, registro/atualização/revogação do Expo Push Token,
deep link direto para o jogo/evento correspondente, tratamento em
foreground, e uma central in-app simples — não lidas/lidas/marcar como
lida — ver [docs/notifications.md](docs/notifications.md)). A Home é
construída inteiramente sobre o dashboard agregado do `gestaofut-api`, com
um layout distinto para quem administra (jogo/vagas/espera, sinais
financeiros/evento, ações rápidas) e para quem só joga (próximo jogo e
minha confirmação, minha mensalidade, próximo evento) — ver
[docs/home.md](docs/home.md). Veja [docs/architecture.md](docs/architecture.md)
para o que vem a seguir.

## Stack

- React Native (Expo SDK 57) + TypeScript
- Expo Router (navegação por arquivos)
- TanStack Query (dados remotos)
- Zustand (estado local global)
- React Hook Form + Zod (formulários e validação)
- Expo SecureStore (tokens sensíveis)
- `decimal.js` (aritmética monetária segura no dashboard financeiro — ver [docs/finance.md](docs/finance.md))
- `expo-clipboard` ("Copiar" na preview de escala compartilhável — ver [docs/matches.md](docs/matches.md))
- `expo-image-picker` + `expo-file-system` (upload de avatar/logo direto para o R2 — ver [docs/uploads.md](docs/uploads.md))
- `expo-notifications` + `expo-device` (push via Expo, Expo Push Token — ver [docs/notifications.md](docs/notifications.md))
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
- [docs/matches.md](docs/matches.md) — jogos, confirmação de presença, fila/oferta, admin
- [docs/finance.md](docs/finance.md) — mensalidades, cobranças avulsas, pagamentos, pendências
- [docs/events.md](docs/events.md) — eventos genéricos (churrasco e outros), confirmação, entitlement, admin
- [docs/uploads.md](docs/uploads.md) — avatar/logo do grupo, picker, upload presigned para o R2, progresso/erro/retry/preview
- [docs/notifications.md](docs/notifications.md) — push (Expo Notifications), permissão contextual, device, deep link, foreground, central in-app
- [docs/home.md](docs/home.md) — Home sobre o dashboard agregado, AdminHome vs. MemberHome
- [docs/security-review.md](docs/security-review.md) — revisão de segurança completa (achados, severidade, correções)
- [docs/release.md](docs/release.md) — EAS Build (development/preview/production), identificadores por ambiente
- [docs/development.md](docs/development.md) — ambiente, testes, como adicionar uma feature
