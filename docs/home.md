# Home (dashboard agregado)

A Home consome inteiramente `GET /groups/:groupId/dashboard` (ver
gestaofut-api docs/dashboard.md) através de um único `useDashboard` —
substitui a cadeia anterior de `useNextMatch` (→ `useMatches`, lista
inteira sem filtro) + `useMatchParticipants` + `useGroup` +
`useNextEventCard` (→ `useEvents`, lista inteira) + `useEventParticipants`
por uma única requisição, já moldada pelas permissions de quem pergunta —
nada é escondido no cliente que o servidor não devesse ter enviado.

## Onde cada pedaço mora

```text
src/services/api/endpoints/dashboard.ts   Tipos + GET .../dashboard (espelha o contrato do gestaofut-api)
src/features/home/
  hooks/
    useApiStatus.ts        GET /health — diagnóstico técnico, hoje em MoreScreen (ver "Diagnóstico" abaixo)
    useDashboard.ts         a única query da Home
  utils/
    home-datetime.ts        formatWeekdayShortDate ("QUARTA, 12 AGO"), isSameLocalDay
    vagas.ts                 remainingSlots (capacidade − confirmados, nunca negativo)
    pick-my-monthly-fee.ts   "Minha mensalidade": mês corrente, senão a mais recente
    build-admin-alert-lines.ts  monta a lista compacta de sinais do admin — puro, testado isoladamente
  components/
    AdminNextMatchCard.tsx   hero do admin: jogo + vagas + espera
    AdminAlertsCard.tsx      sinais compactos: confirmações pendentes, financeiro, evento, interessados
    QuickActionsRow.tsx      grade de ações rápidas, cada uma já filtrada por permission
    AdminHome.tsx            compõe os três acima
    MemberNextMatchCard.tsx  "Próximo jogo" + "Minha confirmação"
    MemberMonthlyFeeCard.tsx "Minha mensalidade" — sempre `.../me`, nunca a figura agregada do dashboard
    MemberNextEventCard.tsx  "Próximo evento" + benefício + confirmação
    MemberHome.tsx           compõe os três acima, na ordem de prioridade pedida
  screens/HomeScreen.tsx     decide AdminHome vs. MemberHome e trata loading/erro
```

## Admin vs. Member — como a Home decide qual mostrar

`HomeScreen` usa `can('member.manage') || can('match.manage') ||
can('finance.manage') || can('event.manage')` — qualquer papel com pelo
menos uma permission de gestão além do piso de `MEMBER` cai em
`AdminHome`; todo o resto cai em `MemberHome`. Isso cobre `ORGANIZER`
(`member.manage`+`match.manage`+`event.manage`), `TREASURER`
(`finance.manage`) e `ADMIN`/`OWNER` (tudo) — e é deliberadamente o mesmo
tipo de checagem que o próprio endpoint do dashboard já faz seção por
seção (ver gestaofut-api docs/dashboard.md), só que decidindo entre dois
_layouts_ inteiros em vez de campos individuais.

## ADMIN HOME — "entender em segundos"

Três blocos, nunca mais que isso — a orientação explícita era "não criar
dashboard corporativo cheio de pequenos cards":

1. **`AdminNextMatchCard`** — um único card cobrindo as três primeiras
   prioridades (jogo; vagas; espera) de uma vez: data/hora, "⚽ Jogo de
   hoje" vs. "⚽ Próximo jogo" (`isSameLocalDay`, nunca comparado no
   servidor — é só rótulo), `confirmados / capacidade`, um `Badge` de vagas
   restantes (`remainingSlots`: "N vagas" / "Lotado" / "Sem limite"), a
   fila de espera só quando `waitlisted > 0`, e "Ver escala" para o
   detalhe completo do jogo. Sem esse jogo, mostra um estado vazio simples
   — nunca um card quebrado.
2. **`AdminAlertsCard`** — as prioridades restantes (pagamentos; evento)
   mais o alerta de confirmações pendentes, como uma lista compacta de
   linhas dentro de **um** card (nunca um card por métrica).
   `buildAdminAlertLines` decide, em ordem fixa, quais linhas aparecem —
   nunca mostra "0 pendentes": uma linha só existe quando há algo real para
   sinalizar.
   - `⚠️ N confirmações pendentes` — de `dashboard.alerts.pendingConfirmations`.
   - `💰 {valor} pendentes (N vencidas)` — de `dashboard.finance.pending`
     (mês corrente), com a contagem de vencidas
     (`dashboard.alerts.pendingCharges`) entre parênteses quando > 0. Note
     que isso é **diferente** de `pendingCharges` sozinho: o valor em
     dinheiro é sempre o do mês corrente; "vencidas" é histórico completo
     — ver gestaofut-api docs/dashboard.md para a distinção exata.
   - `🔥 {título} · N confirmados` — de `dashboard.nextEvent`, sempre que
     existir (não é condicionado a estar "hoje").
   - `👥 N interessados aguardando` — de
     `dashboard.alerts.administrativeSituations`.
3. **`QuickActionsRow`** — grade 2 colunas, cada ação só aparece se
   `can(...)` autorizar: "Jogador" (`member.manage` → `/add-player`),
   "Pagamento" (`finance.manage` → `/finance`), "Evento" (`event.manage` →
   `/events/create`); "Compartilhar" (nenhuma permission — abre o share
   sheet nativo do RN com um resumo do próximo jogo, ou uma frase genérica
   quando não há jogo). Isso significa que a grade final **varia por
   papel**: um `ORGANIZER` nunca vê "Pagamento"; um `TREASURER` nunca vê
   "Jogador"/"Evento" — testado explicitamente em `AdminHome.test.tsx`.

## MEMBER HOME — "ver principalmente sua participação"

Três cards, na ordem de prioridade pedida:

1. **`MemberNextMatchCard`** — "Próximo jogo" e "Minha confirmação" juntos.
   A identidade/capacidade/status do jogo vêm de `dashboard.nextMatch`; a
   participação do próprio usuário vem de `useMyMatchParticipant`/
   `useMatchParticipants` **escopados a esse único `matchId`** — nunca mais
   a lista inteira de jogos do grupo que `useNextMatch` buscava antes.
   Reaproveita `ConfirmationButtons`/`RequestParticipationCard` (o mesmo
   núcleo de `matches`, sem duplicar a lógica de estados/fila/oferta — ver
   `gestaofut-app docs/matches.md`).
2. **`MemberMonthlyFeeCard`** — "Minha mensalidade": sempre
   `useMyMonthlyFees` (`.../me`), **nunca** `dashboard.finance` (que é
   `finance.read`-gated e um `MEMBER` nunca tem essa permission — ver
   gestaofut-api docs/finance.md, "PRIVACIDADE"). `pickMyMonthlyFeeForHome`
   escolhe a mensalidade do mês corrente (calendário local do dispositivo)
   ou, na ausência, a mais recente.
3. **`MemberNextEventCard`** — "Próximo evento", menor prioridade da
   lista: quando não há evento, o componente não renderiza nada (mesma
   convenção de `NextEventCard`), em vez de um card vazio disputando
   atenção com jogo/mensalidade. Mostra "Incluso na mensalidade"
   (`useMyEventEntitlement`) e `EventConfirmationButtons`
   (`useMyEventParticipant`) quando aplicável.

## Diagnóstico ("Conexão com o servidor") — movido para `MoreScreen`

`useApiStatus` (a prova de arquitetura original, ver
[architecture.md](architecture.md), "Módulo `system` de referência")
morava na Home antes desta reconstrução. Não há espaço hierárquico para um
card de diagnóstico técnico ao lado de jogo/pagamentos/evento — ele agora
vive em `MoreScreen`, ao lado do card "GestãoFut / Versão 0.1.0", onde
informação de "sobre o app" já morava.

## UX

- **Mobile primeiro / informação hierarquizada**: cada tela tem no máximo
  3–4 blocos visuais, nunca uma grade de métricas pequenas. A ordem dos
  componentes é literalmente a ordem de prioridade pedida — não há
  reordenação por preferência do usuário.
- **Estados vazios nunca competem com conteúdo real**: `AdminAlertsCard` e
  `MemberNextEventCard` retornam `null` (não um card "tudo certo"/"nenhum
  evento") quando não há nada digno de nota — só `AdminNextMatchCard` e
  `MemberNextMatchCard` sempre renderizam algo, porque "jogo" é a
  prioridade nº 1 em ambas as Homes e merece um espaço reservado mesmo
  vazio.
- **Nunca copiar o wireframe da tarefa literalmente quando havia solução
  melhor**: o mockup original usava texto puro ("+ Jogador", "$
  Pagamento") para as ações rápidas; a implementação usa ícones Ionicons
  (mesma biblioteca já usada em `MembersScreen`/`EventsListScreen`) por
  consistência visual com o resto do app.

## TESTES

- `home-datetime.test.ts`, `vagas.test.ts`, `pick-my-monthly-fee.test.ts`,
  `build-admin-alert-lines.test.ts` — as quatro funções puras, isoladas.
- `AdminNextMatchCard.test.tsx`, `AdminAlertsCard.test.tsx`,
  `QuickActionsRow.test.tsx` — comportamento visual de cada peça do
  `AdminHome`, isolada.
- `AdminHome.test.tsx` — a peça que mais precisava de "testar diferentes
  permissions": três papéis (`ADMIN`, `ORGANIZER`, `TREASURER`) e qual
  subconjunto de ações rápidas cada um vê, mais o conteúdo exato da
  mensagem de "Compartilhar".
- `MemberNextMatchCard.test.tsx`, `MemberMonthlyFeeCard.test.tsx`,
  `MemberNextEventCard.test.tsx`, `MemberHome.test.tsx` — os três cards do
  jogador e sua composição, incluindo a garantia de que nenhuma figura
  agregada de financeiro aparece ali.
- `useDashboard.test.tsx` — a query em si (habilitação condicional a
  `groupId`).
- `HomeScreen.test.tsx` — loading/erro, e que o papel do usuário
  realmente decide `AdminHome` vs. `MemberHome`.
