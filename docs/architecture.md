# Arquitetura

## Estrutura de pastas

```text
app/                      Expo Router — apenas rotas finas
  _layout.tsx              Root: providers, splash/bootstrap, <Stack>
  index.tsx                 Redirect (auth) vs (group-setup) conforme sessão
  (auth)/
    _layout.tsx
    login.tsx, register.tsx  → montam telas de src/features/auth/screens
  (group-setup)/            Resolve o grupo ativo antes de liberar (app) —
    _layout.tsx              ver docs/multi-tenancy.md
    index.tsx                 → GroupGateScreen
    create.tsx                 → CreateGroupScreen
  (app)/
    _layout.tsx              <Tabs> dinâmicas conforme permissions
    index.tsx, games.tsx, ... → montam telas de src/features/*
  group-settings.tsx, switch-group.tsx → fora dos grupos de rota acima,
    empilhadas por cima das tabs (ver docs/navigation.md)

src/
  components/
    ui/                    Design system (Screen, Text, Button, ...)
    common/                Composições reutilizáveis não específicas de um módulo
  features/
    <nome>/
      screens/              Telas reais (o que as rotas montam)
      hooks/                 Hooks específicos da feature (ex.: queries)
      schemas/               Schemas Zod da feature
  services/
    api/                   Cliente HTTP, env, erros, query client/keys
    secure-storage.ts       Wrapper do Expo SecureStore
  store/                   Zustand — estado local global (não cache de API)
  hooks/                   Hooks verdadeiramente cross-cutting
  theme/                   Tokens de design (cores, spacing, tipografia)
  types/                   Tipos compartilhados (ex.: env.d.ts)
  utils/                   Helpers puros

assets/                   Ícones, splash
```

Só existem pastas com conteúdo real — nada foi criado "para o futuro" vazio.

## Regra central: rotas finas

Um arquivo em `app/` nunca contém regra de negócio, chamada de API direta ou
lógica de formulário — ele só importa e renderiza uma screen de
`src/features/<nome>/screens/`. Exemplo (padrão a seguir quando o módulo de
partidas for implementado, ainda não implementado nesta etapa):

```text
app/(app)/matches/[id].tsx  →  apenas monta src/features/matches/screens/MatchDetailsScreen
```

Isso mantém a navegação (Expo Router) e a lógica de tela desacopladas: trocar
o roteador não exigiria tocar nas screens, e testar uma screen não exige
montar o Router.

Isso já foi seguido ao implementar o módulo de partidas:
`app/(app)/games.tsx` e `app/match/[matchId].tsx` só importam e renderizam
`GamesScreen`/`MatchDetailsScreen` de `src/features/matches/screens/` — ver
[matches.md](matches.md).

## Módulo `system` de referência

Não é uma feature de produto — existe para provar a arquitetura ponta a
ponta com algo real e de baixo risco: `src/features/home/hooks/useApiStatus.ts`
usa TanStack Query para chamar `GET /health` do `gestaofut-api` e
`HomeScreen` exibe o resultado com os estados loading/error do design
system. Isso valida cliente HTTP, TanStack Query e design system juntos sem
inventar dados de negócio.

## Feature `groups` (organizations, grupos, permissions)

Primeira feature de produto real, além de `auth`. Detalhada em
[multi-tenancy.md](multi-tenancy.md); do ponto de vista arquitetural segue a
mesma estrutura `screens/hooks/schemas` das demais features, com dois
acréscimos:

- `components/` — composições pequenas específicas da feature (`ChipSelect`,
  `GroupPicker`) que não fazem sentido no design system genérico.
- `utils/` — `permissions.ts` (espelho não-autoritativo do RBAC do
  `gestaofut-api`), `tab-visibility.ts`, `slugify.ts`, `sport-labels.ts`.

`src/store/group-store.ts` (o "GroupContext") e a leitura de
`SECURE_KEYS.activeGroupId` seguem os mesmos padrões de `auth-store`/
`secure-storage.ts` já estabelecidos — ver
[state-management.md](state-management.md).

## Feature `matches` (jogos, confirmação, admin)

Segunda feature de produto real além de `groups`, e a mais central do
produto (confirmar presença em um jogo). Detalhada em
[matches.md](matches.md); do ponto de vista arquitetural segue a mesma
estrutura `screens/hooks/utils/components` das demais features, com dois
acréscimos deliberados:

- **Reuso cross-feature em vez de duplicação**: `ChipSelect`
  (`src/features/groups/components/`) e `displayNameForMember`
  (`src/features/groups/utils/`) são reaproveitados diretamente por
  `matches` em vez de duplicados — ambos já eram genéricos o suficiente (um
  seletor de chip único, um placeholder de nome a partir de um id), e
  `groups` só os teve primeiro por acaso de ordem de implementação.
- **`InfoRow`** (`src/components/common/InfoRow.tsx`) foi extraído do
  `PlayerDetailScreen` original para o design system comum assim que
  `MatchDetailsScreen` precisou exatamente da mesma linha rótulo/valor — a
  segunda ocorrência real é o ponto em que a duplicação vira abstração,
  não antes.

`matches` depende de `useGroupMembers`/`useGroup` (do módulo `groups`) e de
`useCurrentUser` (do módulo `auth`) para resolver "qual é o meu
`GroupMember`" e "qual o nome do grupo" — a mesma dependência cruzada entre
features já aceita no restante do app.

## Por que este é um bom ponto de partida

- Cada peça (design system, cliente HTTP, store, navegação) é testável
  isoladamente.
- Adicionar uma feature real (financeiro) significa criar uma pasta em
  `src/features/<nome>/` e registrar suas rotas — não exige mudar nada da
  fundação, como `groups` e `matches` já demonstraram.
- Nenhuma decisão aqui pressupõe como o backend de negócio vai se parecer
  além do contrato já validado (`/health`, `/api/v1`, auth, organizations/
  groups).
