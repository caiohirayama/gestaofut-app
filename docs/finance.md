# Financeiro (mensalidades, cobranças avulsas, pagamentos, pendências)

Consome o módulo `finance` do `gestaofut-api` (ver o `docs/finance.md` desse
repositório) — nenhum campo/endpoint foi inventado no cliente.

## Onde cada pedaço mora

```text
src/services/api/endpoints/finance.ts   Tipos + chamadas HTTP (espelha o contrato do gestaofut-api)
src/features/finance/
  utils/
    money.ts             formatMoney/sumMoney — decimal.js, nunca Number(...) direto
    finance-labels.ts     labels/variantes de Badge para status/tipo/método
    finance-datetime.ts   mês corrente, formatação e navegação de (ano, mês)
    finance-summary.ts    dashboard (previsto/recebido/pendente/avulsos) + lista unificada filtrável
    cash-transaction-summary.ts   CAIXA: entradas/saídas do mês + filtro categoria/período
  schemas/
    cash-expense-form-schema.ts   validação da "Nova despesa" (zod)
  hooks/
    useMonthlyFees.ts    lista (admin) + "minha" (self) + waive/cancel
    useCharges.ts        idem, para cobranças avulsas
    usePayments.ts       lista (admin) + "meus" (self) + registrar pagamento manual
    useCashTransactions.ts   CAIXA: lista + saldo + criar despesa manual + estornar
  components/
    FinanceDashboard.tsx    os quatro cartões do dashboard mensal
    MonthPicker.tsx         seletor de mês (‹ Mês Ano ›) — reaproveitado pelo caixa
    FinanceFilters.tsx      status / tipo / jogador
    PendingItemRow.tsx      uma mensalidade/cobrança + "Registrar pagamento" (finance.manage)
    PaymentRow.tsx          uma linha de pagamento, somente leitura
    CashBalanceSummary.tsx    saldo atual + entradas/saídas do mês
    CashTransactionFilters.tsx   filtro de categoria do caixa
    CashTransactionRow.tsx    uma linha do caixa + "Estornar" (finance.manage)
  screens/
    FinanceScreen.tsx     ADMIN: dashboard + filtros + lista de pendências (+ botão "Caixa")
    MyFinanceScreen.tsx   JOGADOR: minha mensalidade / meus avulsos / meus pagamentos / minhas pendências
    CashTransactionsScreen.tsx   CAIXA: saldo + lista + "+ Nova despesa"/"+ Novo lançamento"
    CashExpenseFormScreen.tsx    formulário único de lançamento manual (sempre EXPENSE)
app/(app)/finance.tsx   tab "Financeiro" (gated por finance.read, ver docs/navigation.md)
app/my-finance.tsx      rota "Meu financeiro", fora das tabs (alcançada por MoreScreen)
app/cash-transactions/index.tsx   rota "Caixa", fora das tabs (alcançada por FinanceScreen)
app/cash-transactions/create.tsx  rota do formulário de despesa manual
```

## ADMIN: tab "Financeiro"

A tab já existia como placeholder (`ComingSoonScreen`) e já estava
corretamente restrita a `finance.read` em `(app)/_layout.tsx`
(`href: tabVisibility(can('finance.read'))`) — só o conteúdo mudou.
`FinanceScreen` não repete essa checagem de permissão para decidir se deve
renderizar (mesma convenção de `MembersScreen`/`GamesScreen`: esconder a
tab é a camada de UX, o 403 real da API é a camada de segurança — ver
[state-management.md](state-management.md)); ela só usa
`can('finance.manage')` para decidir se mostra a ação de registrar
pagamento em cada linha.

### Dashboard mensal

`computeDashboardTotals(monthlyFees, charges, year, month)`
(`finance-summary.ts`, pura e testada isoladamente) calcula os quatro
números pedidos, para um mês selecionado via `MonthPicker`:

| Cartão | Cálculo |
| --- | --- |
| Previsto | Soma de `amount` de toda mensalidade daquele `(referenceYear, referenceMonth)`, qualquer status |
| Recebido | O mesmo filtro, só `status = PAID` |
| Pendente | O mesmo filtro, `status` em `PENDING`/`OVERDUE` |
| Avulsos | Soma de `amount` de toda cobrança cujo mês (de `dueDate`, ou `createdAt` quando não há `dueDate`) é o mês selecionado, qualquer status |

Uma cobrança avulsa não tem `referenceYear`/`referenceMonth` como uma
mensalidade (não é atrelada a um período recorrente) — por isso "a que mês
ela pertence" cai para `dueDate` (ou `createdAt`, para uma cobrança
`MANUAL` sem vencimento definido).

`GET /finance/monthly-fees` e `GET /finance/charges` são buscados **sem
filtro de servidor** (`useMonthlyFees`/`useCharges`, sem parâmetros) — o
mesmo racional já usado em `matches` (`upcomingMatches`/`matchHistory`,
ver [matches.md](matches.md)): a API aceita filtros por query, mas com
quatro dimensões de filtro (mês, status, tipo, jogador) que podem ser
combinadas livremente, uma única busca completa e partição no cliente é
mais simples do que uma cascata de refetches a cada mudança de filtro.

### Lista de pendências e filtros

`toFinanceListItems` normaliza `MonthlyFee[]` + `Charge[]` numa única lista
ordenada por data de referência (`FinanceListItem`, com `kind` igual a
`'MONTHLY_FEE' | 'MANUAL' | 'GUEST_MATCH_FEE'` — o mesmo valor dobra como
opção do filtro "tipo"). `filterFinanceListItems` aplica, em conjunto (E,
não OU):

- **Mês**: mesmo critério do dashboard (`referenceYear`/`referenceMonth`
  de uma mensalidade, ou o mês derivado de `dueDate`/`createdAt` de uma
  cobrança).
- **Status**: `PENDING`/`PAID`/`OVERDUE`/`CANCELLED`/`WAIVED`.
- **Tipo**: mensalidade / avulso manual / avulso de jogo.
- **Jogador**: por `groupMemberId`, listado via `ChipSelect` com os nomes
  resolvidos por `displayNameForMember` (mesma limitação de contrato de
  `matches`/`players`: a API não expõe nome/e-mail de outro membro, só
  `groupMemberId → userId`).

## PAGAMENTO MANUAL

`PendingItemRow` mostra "Registrar pagamento" só para quem tem
`finance.manage`, e só quando o item ainda está `PENDING`/`OVERDUE`
(`PAYABLE_STATUSES`). O fluxo é dois `Alert.alert` nativos em sequência —
sem introduzir um componente de modal novo, o mesmo padrão já usado para
ações destrutivas em `PlayerDetailScreen` (desativar jogador, promover a
mensalista):

```text
1. "Registrar pagamento" → escolher o método (PIX/Dinheiro/Transferência/Outro)
2. "Confirmar pagamento" → "Registrar R$ X via <método> de <jogador>?" — Cancelar / Confirmar
```

O segundo diálogo é a "solicitação de confirmação" pedida — mostra o valor
e o pagador exatos antes de qualquer chamada de rede. Só ao confirmar,
`useRecordManualPayment` dispara:

```text
POST .../payments                 (RecordPaymentUseCase → PENDING)
POST .../payments/:id/confirm     (ConfirmPaymentUseCase → CONFIRMED, quita o item)
```

**Por que uma única ação do usuário dispara duas chamadas de API**: o
`gestaofut-api` modela "registrar" e "confirmar" como passos separados
(pensando num fluxo futuro de "aguardar confirmação bancária" para uma
`TRANSFER`, ver `gestaofut-api docs/finance.md`), mas um treasurer
registrando manualmente um recebimento já presenciado (PIX na hora,
dinheiro em mãos) quer dizer, na prática, "isso já foi pago" — não faz
sentido a UI expor um estado intermediário `PENDING` que precisaria de uma
segunda ação manual para virar `CONFIRMED`. Se um fluxo de pagamento
assíncrono (aguardando confirmação bancária) vier a ser necessário, ele
teria sua própria ação distinta em vez de reusar este botão — ver
"Limitações conhecidas" abaixo.

O pagador (`payerUserId`) é sempre o `userId` do dono do item sendo pago —
esta versão não oferece "registrar em nome de outra pessoa" na UI (a API
já suporta, ver `gestaofut-api docs/finance.md`, mas não há um seletor de
pagador aqui).

### Double submit e feedback

- **Double submit**: o botão usa `Button`'s `loading`/`disabled` (mesmo
  padrão de toda mutation no app) — desabilitado enquanto
  `useRecordManualPayment` está em andamento. Um `Alert.alert` nativo não
  pode ser tocado duas vezes antes de fechar, então as duas caixas de
  diálogo em si não precisam de uma guarda adicional.
- **Feedback**: erro de rede mostra uma linha vermelha inline
  (`recordPayment.isError`), no mesmo padrão de
  `getMatchParticipantErrorMessage` em `matches` — sem uma mensagem
  específica por código ainda (ver "Limitações conhecidas").
- **Atualizar queries relevantes**: ao suceder, invalida as seis queries
  financeiras do grupo (mensalidades/cobranças/pagamentos, cada uma nas
  versões "admin" e "minha") — um pagamento pode quitar tanto uma
  mensalidade quanto uma cobrança, e tanto o dashboard quanto a lista de
  pendências dependem de ambas; um `invalidateQueries` cobre os dois casos
  sem precisar decidir, no cliente, qual árvore de cache foi afetada.

## JOGADOR: "Meu financeiro"

Alcançado por um botão em `MoreScreen` (`/my-finance`, fora das tabs — ver
[navigation.md](navigation.md)), com quatro seções:

```text
Minhas pendências    mensalidade(s) + avulso(s) ainda PENDING/OVERDUE
Minha mensalidade    toda mensalidade, qualquer status
Meus avulsos         toda cobrança avulsa, qualquer status
Meus pagamentos      todo pagamento feito por mim (somente leitura)
```

**"Jogador nunca pode visualizar dívida de outro"**: as quatro listas vêm
exclusivamente dos endpoints `.../me` (`useMyMonthlyFees`, `useMyCharges`,
`useMyPayments`) — `ListMyMonthlyFeesUseCase`/`ListMyChargesUseCase`
resolvem o `groupMemberId` do chamador no servidor a partir do JWT;
`ListMyPaymentsUseCase` filtra por `payerUserId` do chamador. **Não existe
nenhum parâmetro nesta tela** (`groupMemberId`, `payerUserId` ou
equivalente) que o cliente envie e que pudesse, mesmo por engano, ser
manipulado para pedir o financeiro de outra pessoa — ver
`gestaofut-api docs/finance.md`, "PRIVACIDADE". `PendingItemRow` é
reaproveitado aqui com `canManage={false}`, então nenhuma ação de
pagamento aparece — é uma visão somente leitura.

Um item `PENDING`/`OVERDUE` aparece tanto em "Minhas pendências" quanto na
seção "Minha mensalidade"/"Meus avulsos" correspondente — isso é
intencional (a pendência é um resumo de "o que ainda devo", não uma lista
mutuamente exclusiva das outras duas), não uma duplicação por engano.

## UX: moeda

`formatMoney(amount, currency)` (`money.ts`) usa
`Intl.NumberFormat('pt-BR', { style: 'currency', currency })` — `currency`
vem sempre de `GroupSettings.currency` (`useGroupSettings`, default `'BRL'`
do lado do servidor), nunca hardcoded como `'BRL'` no componente que
formata. O locale de exibição continua `pt-BR` (toda a cópia do app é em
português) independentemente de qual moeda está sendo formatada — só o
símbolo/formato mudam. Somas feitas no cliente (os quatro totais do
dashboard) passam por `sumMoney` (`decimal.js`), nunca `Number(...)` /
`+` direto sobre a string `NUMERIC` que a API devolve — mesmo racional do
`gestaofut-api` (ver seu `docs/database.md`/`docs/finance.md`).

## CAIXA

Consome `gestaofut-api`'s `finance` module extension (ver `gestaofut-api
docs/finance.md`, "CAIXA") — nenhum campo/regra novo inventado no cliente:
INCOME só nasce de um pagamento confirmado (não há botão para isso aqui),
EXPENSE só nasce manualmente via `finance.manage`, e um lançamento nunca é
deletado, só cancelado/estornado.

Alcançado por um botão "Caixa" no cabeçalho de `FinanceScreen` (mesmo
gate `finance.read` da tab — a tela em si não repete a checagem de
permissão para renderizar, mesma convenção do resto do módulo).

### Saldo atual / Entradas do mês / Saídas do mês

`CashBalanceSummary` mistura duas fontes deliberadamente diferentes:

| Cartão | Origem |
| --- | --- |
| Saldo atual | `GET .../cash-transactions/balance` — `SUM(INCOME) - SUM(EXPENSE)` **de todo o histórico**, calculado no servidor (Postgres), nunca no cliente |
| Entradas do mês | `computeCashMonthSummary` (`cash-transaction-summary.ts`) — soma no cliente, via `sumMoney`, das linhas `CONFIRMED` do mês selecionado (`MonthPicker`) |
| Saídas do mês | idem, para `EXPENSE` |

O saldo é sempre a resposta do servidor, nunca recomputado localmente — a
mesma razão do `gestaofut-api` (`docs/finance.md`, "CAIXA"): o livro não
tem recorte de tempo, então somar tudo no cliente a cada abertura da tela
cresceria sem limite. Já "entradas/saídas do mês" não têm um endpoint
dedicado (a API só agrega o saldo all-time), então esses dois números
saem da mesma lista já buscada para a tabela abaixo — mesmo racional do
`computeDashboardTotals` da tela de pendências.

### Lista de lançamentos e filtros

`GET .../cash-transactions` é buscado **sem filtro de servidor**
(`useCashTransactions`, sem parâmetros) — a API aceita `type`/`category`/
`status` por query, mas não período; como o cliente já precisa buscar tudo
para computar "entradas/saídas do mês" de qualquer forma, filtrar
categoria/período no cliente (`filterCashTransactions`) evita uma segunda
busca. "Filtros: categoria; período" —a categoria é um `ChipSelect`
(`CashTransactionFilters`), o período reaproveita o `MonthPicker` já
existente (mesmo componente que já dirige o dashboard de pendências).

### "+ Nova despesa" / "+ Novo lançamento" (`finance.manage`)

Os dois botões pedidos abrem o **mesmo** formulário
(`CashExpenseFormScreen`) — não há duas ações distintas porque a API só
tem um caminho de criação manual, e esse caminho só cria `EXPENSE` (ver
`gestaofut-api docs/finance.md`, "CAIXA": INCOME só nasce de um pagamento
confirmado). Duplicar a UI para uma capacidade que só existe de um jeito
adicionaria confusão, não opções reais.

Campos: categoria (`ChipSelect`, mesmo enum do servidor), valor (aceita
`,` ou `.` como separador decimal — `normalizeAmountInput`, `decimal.js`,
nunca `Number(...)`), data (`DD/MM/AAAA`, opcional — vazio significa "hoje"
e o campo é simplesmente omitido do corpo da requisição, deixando o
servidor aplicar o próprio default) e descrição (opcional).

### CANCELAMENTO/ESTORNO — "não permitir delete simples"

`CashTransactionRow` nunca oferece excluir nada. A única ação é
"Estornar", atrás de uma confirmação nativa (`Alert.alert`, mesmo padrão
de "Registrar pagamento" em `PendingItemRow`) — e só aparece para uma
linha `CONFIRMED` **registrada manualmente** (`paymentId === null`) quando
o viewer tem `finance.manage`. Uma linha gerada por um pagamento
(`paymentId` preenchido) mostra uma dica em texto ("Gerado por um
pagamento — estorne o pagamento para cancelar") em vez de um botão — a API
rejeita um cancelamento direto nesse caso (`ValidationError`), e replicar
esse mesmo caminho de erro na UI sem contexto seria pior do que já não
oferecer a ação.

### PERMISSIONS e mutations testados

`CashTransactionsScreen.test.tsx`/`CashTransactionRow.test.tsx` cobrem: os
dois botões de criação somem para quem não tem `finance.manage` (mesmo
quando a tela é renderizada diretamente — o gate real é o 403 da API, a
tab é só UX); "Estornar" só aparece para uma linha `CONFIRMED`/
`paymentId === null` com `finance.manage`; a confirmação nativa precede
toda chamada de mutação; um erro de rede mostra uma linha inline. Testes
de `useCashTransactions.ts` cobrem a invalidação de `cash-transactions` e
`cash-transactions/balance` após criar ou estornar um lançamento.

## Limitações conhecidas do contrato atual

- **"Registrar pagamento" cobre um único item por vez** — o
  `gestaofut-api` permite um pagamento cobrir várias mensalidades/cobranças
  de uma vez (`billables: [...]`), mas esta UI só usa isso com uma entrada
  por chamada; pagar vários itens de uma vez exigiria hoje um registro por
  item.
- **Sem seletor de pagador** — o pagamento manual sempre usa o `userId` do
  dono do item; a API permite um pagador diferente do dono da dívida, mas
  não há campo para isso na UI ainda.
- **Sem mensagem de erro específica por código** no registro de pagamento
  (ex.: um 409 de "já foi pago por outra transação concorrente" mostra a
  mesma mensagem genérica que qualquer outra falha de rede) — ao contrário
  de `getMatchParticipantErrorMessage` em `matches`, que já trata um 409
  específico.
- **Sem tela de detalhe de um pagamento** (estornar/cancelar pela API) —
  a API expõe `confirm`/`cancel`/`refund`, mas esta versão só usa
  `record` + `confirm` em sequência; reverter um pagamento manualmente
  ainda não tem um botão nesta UI.
