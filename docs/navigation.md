# Navegação (Expo Router)

## Grupos

```text
app/
  _layout.tsx      Providers globais + <Stack> raiz
  index.tsx        Redireciona para (group-setup) ou (auth)/login conforme sessão
  (auth)/          Fluxo não autenticado
    _layout.tsx    <Stack headerShown={false}>
    login.tsx
    register.tsx
  (group-setup)/   Resolve o grupo ativo — ver docs/multi-tenancy.md
    _layout.tsx    <Stack headerShown={false}>
    index.tsx      GroupGateScreen (loading/erro/vazio/seleção/auto-seleção)
    create.tsx     CreateGroupScreen
  (app)/           Fluxo autenticado, com um grupo ativo
    _layout.tsx    <Tabs> dinâmicas conforme permissions
    index.tsx      Início
    games.tsx      Jogos (GamesScreen)
    players.tsx    Jogadores (MembersScreen)
    finance.tsx    Financeiro (FinanceScreen — dashboard + pendências, ver docs/finance.md)
    more.tsx       Mais (grupo ativo, eventos, meu financeiro, trocar grupo, configurações, "Sair")
  group-settings.tsx  GroupSettingsScreen — fora de (app), empilhada por
                      cima das tabs (ver "Telas fora das tabs" abaixo)
  switch-group.tsx    SwitchGroupScreen — idem
  add-player.tsx      AddPlayerScreen — idem
  my-finance.tsx      MyFinanceScreen — idem (ver docs/finance.md)
  player/[memberId].tsx  PlayerDetailScreen — idem, primeira rota dinâmica do app
  matches/[matchId].tsx  MatchDetailsScreen — idem, mesmo padrão de rota dinâmica
  matches/[matchId]/roster.tsx  MatchRosterPreviewScreen — "Compartilhar escala" (ver docs/matches.md)
  events/index.tsx        EventsListScreen — idem, alcançada pelo botão "Eventos" em MoreScreen (ver docs/events.md)
  events/[eventId].tsx    EventDetailScreen — idem, mesmo padrão de rota dinâmica
  events/create.tsx       EventFormScreen (modo criação) — idem
  events/[eventId]/edit.tsx  EventFormScreen (modo edição) — idem
  cash-transactions/index.tsx   CashTransactionsScreen — CAIXA, alcançada pelo botão "Caixa" em FinanceScreen (ver docs/finance.md)
  cash-transactions/create.tsx  CashExpenseFormScreen — "+ Nova despesa"/"+ Novo lançamento", idem
```

## Como a sessão decide o grupo

`app/index.tsx` lê `useAuthStore` e renderiza `<Redirect>` para
`/(group-setup)` ou `/(auth)/login` — nunca direto para `/(app)`. O estado
de sessão (`loading` → `authenticated` | `unauthenticated`) vem de
`src/hooks/useBootstrapAuth.ts`, que lê o refresh token do Expo SecureStore
uma única vez na inicialização e, se houver um, chama `POST /auth/refresh`
para validar e renovar a sessão (ver [state-management.md](state-management.md)
para o fluxo completo). Enquanto isso não resolve (`loading`),
`app/_layout.tsx` mantém a splash screen visível
(`SplashScreen.preventAutoHideAsync`) para não piscar a tela errada.

A validade do token nunca é decidida no cliente — quem decide é sempre a
resposta do `gestaofut-api` a `/auth/refresh` (ver `docs/security.md` desse
repositório).

## Como a sessão decide o grupo ativo

Autenticado não é suficiente para entrar em `(app)`: falta saber _qual_
grupo. `(group-setup)/index.tsx` (`GroupGateScreen`) resolve isso — carrega
organizações/grupos/roles da API e decide entre auto-selecionar (0 ou 1
opção viável), redirecionar para criação, mostrar um estado vazio, ou pedir
para escolher. Ver [multi-tenancy.md](multi-tenancy.md) para a árvore de
decisão completa e [state-management.md](state-management.md) para onde o
grupo ativo fica guardado (`group-store.ts`). `app/(app)/_layout.tsx` tem uma
guarda própria: sem `activeGroupId` no store, redireciona de volta para
`/(group-setup)` em vez de renderizar as tabs.

## Tabs

`(app)/_layout.tsx` define as 5 tabs do produto (Início, Jogos, Jogadores,
Financeiro, Mais) usando `@expo/vector-icons` (Ionicons outline), mas nem
todas aparecem sempre: cada `<Tabs.Screen>` passa
`options={{ href: tabVisibility(can(permission)) }}` —
`src/features/groups/utils/tab-visibility.ts` mapeia um booleano para a
convenção do Expo Router (`undefined` = mostra, `null` = esconde da barra
sem desregistrar a rota). As permissions vêm de
`useActiveGroupPermissions()` — ver [multi-tenancy.md](multi-tenancy.md)
para a tabela completa de qual permission gate cada tab.

Início e Mais são sempre visíveis. Jogadores (`MembersScreen` — lista com
filtros/busca/permissions, ver [multi-tenancy.md](multi-tenancy.md)), Jogos
(`GamesScreen` — lista de próximos jogos + histórico, ver
[matches.md](matches.md)) e Financeiro (`FinanceScreen` — dashboard mensal
+ lista de pendências, só para `finance.read`, ver [finance.md](finance.md))
já têm telas reais.

## Telas fora das tabs

`app/group-settings.tsx`, `app/switch-group.tsx`, `app/add-player.tsx`,
`app/my-finance.tsx`, `app/player/[memberId].tsx`,
`app/matches/[matchId].tsx`, `app/events/**` e `app/cash-transactions/**`
ficam soltas na raiz de `app/` (irmãs de `(auth)`/`(group-setup)`/`(app)`),
não dentro de `(app)/`:
uma tela alcançada por `router.push` a partir de dentro de uma tab (ex.:
"Adicionar jogador", tocar numa linha da lista de jogadores, ou tocar no
card de destaque/numa linha da lista de jogos) precisa estar registrada no
`<Stack>` raiz, não na lista fixa de `<Tabs.Screen>` — é o padrão
recomendado do Expo Router para uma tela "de detalhe" que empilha por cima
da barra de tabs em vez de substituí-la. `my-finance.tsx`, `events/index.tsx` e `cash-transactions/index.tsx`
seguem essa mesma regra mesmo não tendo uma linha/card específico que leve
até elas — são alcançadas por botões em `MoreScreen` ("Meu financeiro" /
"Eventos") ou em `FinanceScreen` ("Caixa"), mas continuam sendo telas
empilhadas, não tabs (ver [finance.md](finance.md) e [events.md](events.md)).
Eventos deliberadamente
**não** virou uma 6ª tab (diferente de Financeiro, pedido explicitamente
como tab) — ver [events.md](events.md), "Por que não há uma 6ª aba".

`player/[memberId].tsx` foi a primeira rota dinâmica do app;
`matches/[matchId].tsx` segue o mesmo padrão — navegada via
`router.push({ pathname: '/matches/[matchId]', params: { matchId } })` a
partir de uma linha da `GamesScreen` ou do "Ver detalhes" do card de
destaque da Home (ver [matches.md](matches.md)). O nome da pasta é
plural (`matches/`, não `match/`) de propósito: é o mesmo caminho que uma
futura push notification vai abrir via deep link
(`gestaofut://matches/{matchId}`, resolvido automaticamente pelo
`"scheme": "gestaofut"` do `app.json` — ver [matches.md](matches.md),
"Deep link").

`events/[eventId].tsx` (detalhe) e `events/[eventId]/edit.tsx` (edição)
coexistem sob o mesmo segmento dinâmico — a primeira vez que este app usa
um arquivo dinâmico (`[eventId].tsx`) e uma pasta com o mesmo nome dinâmico
(`[eventId]/`) lado a lado; o Expo Router resolve isso sem ambiguidade
porque `/events/{id}` bate no arquivo e `/events/{id}/edit` bate na pasta.
`matches/[matchId].tsx` + `matches/[matchId]/roster.tsx` seguem o mesmo
padrão para "Compartilhar escala" (ver [matches.md](matches.md)).

## Adicionando uma rota nova

1. Criar a screen em `src/features/<nome>/screens/`.
2. Criar o arquivo em `app/(app)/<nome>.tsx` (ou `app/(app)/<nome>/[id].tsx`
   para rota dinâmica) que só importa e renderiza essa screen. Se a tela não
   for uma tab (um "detalhe" alcançado por push), coloque-a fora de `(app)/`,
   como `group-settings.tsx`/`switch-group.tsx`.
3. Se for uma nova tab, adicionar um `<Tabs.Screen>` em `(app)/_layout.tsx`
   — e decidir se ela é sempre visível ou gated por uma permission via
   `tabVisibility(can(...))`.

Nunca escrever lógica de navegação condicional (ex.: `if (role === ...)`)
dentro de um arquivo de `app/` — isso pertence à screen ou a um hook de
feature (`useActiveGroupPermissions`, no caso de permissions).
