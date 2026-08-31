# Jogos, confirmação de presença e admin

Consome o módulo `matches` do `gestaofut-api` (ver o `docs/matches.md`
desse repositório) — nenhum campo/endpoint foi inventado no cliente. Esta é
a feature mais central do produto: o jogador precisa conseguir abrir o
app e confirmar presença em poucos segundos, sem navegação desnecessária.

## Onde cada pedaço mora

```text
src/services/api/endpoints/matches.ts   Tipos + chamadas HTTP (espelha o contrato do gestaofut-api)
src/features/matches/
  utils/
    match-lists.ts          upcoming/history/pickNextMatch — puro, sem I/O
    match-datetime.ts       "QUARTA · 19:15", data, hora — puro
    match-labels.ts         labels/variantes de Badge para os enums de status
    participant-summary.ts  contagem confirmados/capacidade, roster do admin
    match-error-message.ts  mensagem amigável para o 409 de "sem vaga"
  hooks/
    useMatches.ts            lista (sem filtro) + detalhe
    useNextMatch.ts          deriva o jogo em destaque de useMatches
    useMatchParticipants.ts  lista de participantes + confirm/decline/cancel
    useMyMatchParticipant.ts deriva "minha" participação (groupMemberId → userId → me)
  components/
    NextMatchCard.tsx           card de destaque da Home
    ConfirmationButtons.tsx     "Vou jogar" / "Não vou" — o núcleo da feature
    MatchListRow.tsx            linha da lista de jogos
    ParticipantsAdminPanel.tsx  roster para quem tem match.manage
  screens/
    GamesScreen.tsx          tab "Jogos": próximos + histórico
    MatchDetailsScreen.tsx   detalhe completo + confirmação + admin
```

## Por que não há paginação nem filtro de servidor nas listas

`GET /groups/:id/matches` só aceita um `?status=` exato por requisição — o
mesmo limite já documentado para `GroupMember` (ver `filterMembers` em
[multi-tenancy.md](multi-tenancy.md)). Como "próximos" cobre quatro status
e "histórico" cobre dois, uma única chamada sem filtro
(`useMatches(groupId)`) busca tudo e a partição acontece no cliente
(`upcomingMatches`/`matchHistory`, ambas puras e testadas isoladamente). A
API também não expõe paginação nesse endpoint — o histórico de um grupo de
longa duração pode crescer bastante, mas não há como o cliente resolver
isso sozinho enquanto o contrato não oferecer uma; fica registrado aqui
como limitação conhecida, não como algo a contornar agora.

## O jogo em destaque (Home)

`useNextMatch` pega a lista completa e escolhe o primeiro resultado de
`upcomingMatches` — que já ordena por `startsAt` ascendente entre
`SCHEDULED`/`OPEN`/`CLOSED`/`IN_PROGRESS`. Um jogo `IN_PROGRESS` aparece
primeiro naturalmente mesmo com `startsAt` no passado, porque a ordenação é
só por `startsAt`, e nunca comparamos contra o relógio do dispositivo —
quem decide se um jogo já terminou é sempre o `status` que a API manda (ver
o racional equivalente em `gestaofut-api docs/matches.md`).

`NextMatchCard` (`src/features/matches/components/NextMatchCard.tsx`)
mostra weekday/hora, o nome do grupo (`useGroup`), o local (se houver) e:

- Se o jogo está `OPEN`: a contagem `confirmados / regularCapacity` (ou só
  a contagem, se a capacidade for `null` = sem limite) e, se o usuário já
  tem um registro de participação, os botões de confirmação.
- Caso contrário: um `Badge` com o status do jogo (ex.: "Agendado"), sem
  botões — não existe `MatchParticipant` para confirmar antes do jogo ser
  aberto.

Um link "Ver detalhes" leva para `MatchDetailsScreen` — a única navegação
extra, e opcional (a confirmação em si acontece ali mesmo, no card).

## Confirmar / recusar / cancelar

`ConfirmationButtons` (usado tanto no card da Home quanto em
`MatchDetailsScreen` — um único componente, sem duplicar a lógica) decide o
que renderizar a partir do `status` atual do `MatchParticipant`, porque a
API só aceita transições específicas (mirror de
`ALLOWED_SOURCE_STATUSES` do `gestaofut-api`):

| Status atual                                      | O que aparece                               | Ação do botão "negativo" |
| ------------------------------------------------- | ------------------------------------------- | ------------------------ |
| `PENDING` / `OFFERED` / `WAITLISTED`              | "Vou jogar" + "Não vou"                     | `decline`                |
| `CONFIRMED`                                       | Selo "Presença confirmada" + "Não vou mais" | `cancel`                 |
| `DECLINED` / `CANCELLED` / `ATTENDED` / `NO_SHOW` | Texto informativo, sem botão                | —                        |

O segundo botão nunca é sempre "decline": a partir de `CONFIRMED`, a API só
aceita a transição para `CANCELLED` (chamar `decline` ali devolveria 409) —
por isso o componente escolhe a mutation certa (`cancel` vs. `decline`)
com base no status atual, não um botão genérico "desfazer". A partir de
`DECLINED`/`CANCELLED` não há caminho de volta nessa API; mostrar um botão
que se sabe que vai falhar contrariaria o padrão já estabelecido em
[state-management.md](state-management.md#autorização-continua-no-backend) —
por isso vira texto informativo.

### Double submit e feedback

- **Double submit**: `isPending` combina os três `useMutation` (confirm,
  decline, cancel) — os dois botões visíveis ficam desabilitados enquanto
  **qualquer um** dos três estiver em andamento, não só o que foi
  pressionado. Isso cobre tanto o duplo-toque no mesmo botão quanto tocar
  no outro botão enquanto o primeiro ainda está em voo.
- **Feedback**: o botão pressionado mostra um spinner (`Button` já cobre
  isso via `loading`); em caso de erro, uma linha vermelha aparece com
  `getMatchParticipantErrorMessage(error)` — que trata especificamente um
  `409` de confirmação como "Não há mais vagas disponíveis para esse
  jogo." (a corrida pela última vaga é real e documentada em
  `gestaofut-api docs/matches.md`), e cai nas mensagens genéricas de
  `getApiErrorMessage` para qualquer outro código.
- **Cache**: cada mutation, ao suceder, escreve a resposta do servidor
  direto no cache da lista de participantes via `setQueryData` (não espera
  um refetch) e dispara um `invalidateQueries` de reconciliação em
  paralelo — ver [state-management.md](state-management.md) para o
  racional completo. Isso é o que faz o status mudar na tela assim que a
  resposta chega, sem esperar um segundo round-trip.

## Jogos (lista + histórico)

`GamesScreen` reutiliza `ChipSelect` (da feature `groups`) para alternar
"Próximos"/"Histórico", ambos derivados client-side da mesma busca sem
filtro (ver acima). Cada linha (`MatchListRow`, memoizada) mostra
weekday/hora, local (se houver) e um `Badge` de status; tocar navega para
`MatchDetailsScreen` via `router.push({ pathname: '/match/[matchId]', params: { matchId } })`
— a mesma rota dinâmica acessada pelo "Ver detalhes" do card da Home.

## Detalhes do jogo

`MatchDetailsScreen` mostra, em cards separados:

- **Informações**: data, horário, local/endereço (ou "A definir"),
  `vagas de linha` e `vagas de goleiro` — cada uma como
  `confirmados / capacidade` (ou só `confirmados`, capacidade `null` =
  sem limite). As duas capacidades são independentes, exatamente como no
  backend (ver `gestaofut-api docs/matches.md`).
- **Sua participação**: o `Badge` do próprio status + `ConfirmationButtons`
  (só quando o jogo está `OPEN` — fora disso, mudar de ideia não é mais
  possível pela API). Se o usuário não tiver um `MatchParticipant` nesse
  jogo (ex.: avulso nunca inscrito automaticamente, ou jogo ainda não
  aberto), mostra uma mensagem neutra em vez de esconder a seção
  silenciosamente.
- **Administração** (só com `match.manage`): `ParticipantsAdminPanel`.

## Painel do administrador

Visível só com `match.manage` (o mesmo espelho de permissions de
[multi-tenancy.md](multi-tenancy.md) — o backend responde 403 numa
tentativa de escrita sem essa permission, independentemente do que a UI
mostrar). `buildAdminRoster` (pura, testada isoladamente) separa os
participantes em cinco grupos, batendo com o pedido original:

| Seção       | Regra                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmados | `typeAtMatch=REGULAR`, `status=CONFIRMED`                                                                                                                                                                  |
| Pendentes   | `typeAtMatch=REGULAR`, `status` em `PENDING`/`WAITLISTED`/`OFFERED`                                                                                                                                        |
| Ausentes    | `typeAtMatch=REGULAR`, `status` em `DECLINED`/`CANCELLED`                                                                                                                                                  |
| Goleiros    | `typeAtMatch=GOALKEEPER`, qualquer status (mostrado com o próprio `Badge` de status — goleiro tem capacidade independente, então "confirmado"/"pendente" precisa aparecer por pessoa, não só por contagem) |
| Avulsos     | `typeAtMatch=GUEST`, qualquer status (hoje tende a vir vazio — a API não inscreve avulsos automaticamente ao abrir um jogo; a seção existe e funciona assim que essa inscrição existir)                    |

Como `MatchParticipant` só carrega `groupMemberId` (nunca nome/e-mail —
mesma limitação de contrato já documentada em
[multi-tenancy.md](multi-tenancy.md)), cada linha resolve um nome via
`displayNameForMember` (reaproveitado da feature `groups`), cruzando
`groupMemberId → userId` com `useGroupMembers`.

## Limitações conhecidas do contrato atual

- **Sem paginação** em `GET /matches` (ver acima).
- **Sem inscrição de avulso a um jogo específico** — a seção "Avulsos" do
  admin existe, mas hoje só populada por uma futura ação administrativa que
  ainda não existe na API.
- **Sem cascata de `WAITLISTED → OFFERED`** — a API não promove
  automaticamente quem está na lista de espera quando uma vaga abre;
  `OFFERED` é um status válido de exibição, mas nada nesta versão do
  backend o produz.
