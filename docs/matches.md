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
    participant-summary.ts  contagem confirmados/capacidade, fila ordenada, ofertas ativas, roster do admin
    match-error-message.ts  mensagem amigável para o 409 de "sem vaga"
  hooks/
    useMatches.ts            lista (sem filtro) + detalhe
    useMatchParticipants.ts  lista de participantes + confirm/decline/cancel/request, com polling mais rápido durante uma oferta ativa
    useMyMatchParticipant.ts deriva "minha" participação (groupMemberId → userId → me) + "meu" GroupMember
    useCountdown.ts          deriva {remainingMs, formatted, isExpired} de um instante ISO, nunca guarda o valor como estado próprio
    useMatchRoster.ts        "Compartilhar escala" — busca o texto pronto da API, sem transformação nenhuma no cliente
  components/
    ConfirmationButtons.tsx        "Vou jogar" / "Não vou" / fila / oferta — o núcleo da feature
    RequestParticipationCard.tsx   "Entrar no jogo" self-service para avulsos (GUEST) sem registro ainda
    MatchListRow.tsx               linha da lista de jogos
    ParticipantsAdminPanel.tsx     roster + fila + ofertas ativas para quem tem match.manage
  screens/
    GamesScreen.tsx                tab "Jogos": próximos + histórico
    MatchDetailsScreen.tsx         detalhe completo + confirmação + admin
    MatchRosterPreviewScreen.tsx   preview da escala + Copiar/Compartilhar
app/matches/[matchId].tsx          rota (também o alvo de um deep link /matches/{matchId} — ver "Deep link")
app/matches/[matchId]/roster.tsx   rota do preview de escala — ver "Compartilhar escala"
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

Desde a reconstrução da Home sobre o dashboard agregado (ver
[home.md](home.md)), quem decide "qual é o próximo jogo" para a Home é
`gestaofut-api`'s `GET .../dashboard` (`MatchRepository.findNextUpcoming`,
mesmos status "em aberto" — `SCHEDULED`/`OPEN`/`CLOSED`/`IN_PROGRESS` —
nunca comparados contra o relógio do dispositivo), não mais um hook
`useNextMatch` client-side sobre a lista completa. `AdminNextMatchCard` e
`MemberNextMatchCard` (`src/features/home/components/`) são os cards que
efetivamente aparecem na Home hoje — `ConfirmationButtons`/
`RequestParticipationCard` continuam sendo o mesmo núcleo reaproveitado
descrito abaixo, só que agora acionado a partir desses dois componentes em
vez de um único `NextMatchCard` genérico. `MatchDetailsScreen` continua
sendo o destino de "Ver detalhes"/"Ver escala".

## Entrar em um jogo (avulso) — "REGRA"

Um `GroupMember` do tipo `GUEST` sem `MatchParticipant` ainda neste jogo
pode solicitar participação por conta própria — `requestGuestParticipation`
(`POST .../participants/request`, ver `gestaofut-api docs/matches.md`,
"REGRA"). **Quem decide `CONFIRMED` vs. `WAITLISTED` é sempre o servidor**;
o cliente nunca faz essa conta para autorizar a ação, só para escolher o
texto/label mostrado antes de clicar:

- **Há vaga**: botão "Vou jogar" (mesmo rótulo do fluxo normal — a
  experiência de quem entra direto é idêntica a quem já tinha um registro).
- **Jogo lotado** ("JOGO LOTADO"): mostra o texto "Jogo lotado" e o botão
  vira "Entrar na lista de espera" — pressionar ainda chama o mesmo
  endpoint; o servidor resolve para `WAITLISTED`.

`RequestParticipationCard` recebe esse `isFull` como uma prop booleana
simples (comparação client-side de `confirmados >= capacidade`, a mesma
lógica de `summarizeRegularCapacity`) — é só uma dica de UI, não uma
autorização; o 409 de concorrência real (a vaga sumiu entre o clique e a
resposta) já cai na mesma `getMatchParticipantErrorMessage` usada em
`ConfirmationButtons`. A mutation (`useRequestGuestParticipation`) segue o
mesmo padrão de cache das demais: ao suceder, adiciona a resposta do
servidor à lista já cacheada (`setQueryData`) em vez de só invalidar, e o
double-submit é prevenido desabilitando o botão enquanto `isPending`.

## Confirmar / recusar / cancelar / fila / oferta

`ConfirmationButtons` (usado tanto no card da Home quanto em
`MatchDetailsScreen` — um único componente, sem duplicar a lógica) decide o
que renderizar a partir do `status` atual do `MatchParticipant`, porque a
API só aceita transições específicas (mirror de
`ALLOWED_SOURCE_STATUSES` do `gestaofut-api`):

| Status atual                                      | O que aparece                                                                    | Ação do botão "negativo" |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| `PENDING`                                          | "Vou jogar" + "Não vou"                                                          | `decline`                 |
| `WAITLISTED` ("NA FILA")                           | "Você está na lista de espera." + "Posição aproximada: N" + "Sair da fila"       | `decline`                 |
| `OFERECIDO` (`OFFERED`, "OFERTA")                  | Banner de alta prioridade com contador + "ACEITAR VAGA" (`confirm`) / "RECUSAR"  | `decline`                 |
| `CONFIRMED`                                        | Selo "Presença confirmada" + "Não vou mais"                                      | `cancel`                  |
| `DECLINED` / `CANCELLED` / `ATTENDED` / `NO_SHOW`  | Texto informativo, sem botão                                                     | —                          |

**Importante — `WAITLISTED` não confirma mais diretamente.** Desde que o
`gestaofut-api` passou a oferecer vagas explicitamente (`OFFERED`) em vez de
deixar qualquer um da fila confirmar por conta própria, `ALLOWED_SOURCE_STATUSES.CONFIRMED`
não inclui mais `WAITLISTED` — chamar `confirm` a partir dali agora
responde `409`. Por isso `WAITLISTED` só mostra "Sair da fila" (`decline`);
não existe mais um botão "Vou jogar" nesse estado. A "posição aproximada" é
`computeQueueRank` (`participant-summary.ts`): a posição de `participant`
entre os que **ainda estão** `WAITLISTED` no mesmo pool — não o
`queuePosition` bruto (que nunca é recompactado no backend e pode ter
buracos de gente que já saiu da fila).

**"OFERTA"**: um `OFFERED` é uma vaga reservada para essa pessoa até
`offerExpiresAt`. O banner ("⚽ Uma vaga abriu para você.") usa
`useCountdown(participant.offerExpiresAt)` para o texto "Você tem MM:SS
para confirmar." — o hook **recalcula a cada tick a partir do próprio
`offerExpiresAt`** (`Date.now()` vs. o instante alvo), nunca guardando o
tempo restante como um estado próprio que pudesse dessincronizar do
servidor; é o mesmo princípio do backend ("Postgres é source of truth",
ver `gestaofut-api docs/security.md`) aplicado à UI. Quando o contador
chega a zero, o botão "ACEITAR VAGA" fica desabilitado — o clique real
ainda seria rejeitado pelo servidor se a oferta já tivesse sido processada
pelo worker, mas a UI não espera esse round-trip para deixar de convidar a
uma ação que provavelmente vai falhar.

O segundo botão nunca é sempre "decline" no sentido de mutation: a partir
de `CONFIRMED`, a API só aceita a transição para `CANCELLED` (chamar
`decline` ali devolveria 409) — por isso o componente escolhe a mutation
certa (`cancel` vs. `decline`) com base no status atual, não um botão
genérico "desfazer". A partir de `DECLINED`/`CANCELLED` não há caminho de
volta nessa API; mostrar um botão que se sabe que vai falhar contrariaria o
padrão já estabelecido em
[state-management.md](state-management.md#autorização-continua-no-backend) —
por isso vira texto informativo.

### Polling mais rápido durante uma oferta ativa

`useMatchParticipants` usa um `refetchInterval` baseado em função (TanStack
Query v5): enquanto **qualquer** participante da lista em cache está
`OFFERED`, refaz a busca a cada 5s; caso contrário, não faz polling algum
(`false`). Isso existe porque uma oferta pode expirar **no servidor**
(processada pelo worker BullMQ do `gestaofut-api`, ver o `docs/matches.md`
de lá) sem que o dono da tela tenha feito nada — sem esse polling, o
contador chegaria a zero na UI e ficaria parado ali, sem nunca refletir a
transição real para `WAITLISTED` (ou para o próximo `OFFERED`, se essa
pessoa foi promovida). O polling para sozinho assim que nenhum participante
em cache está mais `OFFERED`.

### Double submit e feedback

- **Double submit**: `isPending` combina os três `useMutation` (confirm,
  decline, cancel) — os dois botões visíveis ficam desabilitados enquanto
  **qualquer um** dos três estiver em andamento, não só o que foi
  pressionado. Isso cobre tanto o duplo-toque no mesmo botão quanto tocar
  no outro botão enquanto o primeiro ainda está em voo. O mesmo padrão vale
  para `RequestParticipationCard` (um único botão, desabilitado enquanto
  `isPending`).
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
  resposta chega, sem esperar um segundo round-trip. `useRequestGuestParticipation`
  segue o mesmo racional, mas *anexa* o novo participante em vez de
  substituir um existente.

## Jogos (lista + histórico)

`GamesScreen` reutiliza `ChipSelect` (da feature `groups`) para alternar
"Próximos"/"Histórico", ambos derivados client-side da mesma busca sem
filtro (ver acima). Cada linha (`MatchListRow`, memoizada) mostra
weekday/hora, local (se houver) e um `Badge` de status; tocar navega para
`MatchDetailsScreen` via `router.push({ pathname: '/matches/[matchId]', params: { matchId } })`
— a mesma rota dinâmica acessada pelo "Ver detalhes" do card da Home.

## Deep link

A rota vive em `app/matches/[matchId].tsx` (renomeada de `app/match/` —
antes do fluxo de fila/oferta não havia motivo para um contrato de URL
estável; agora sim, porque uma notificação push precisa apontar para um
jogo específico). Com o `"scheme": "gestaofut"` já configurado em
`app.json`, o Expo Router resolve automaticamente
`gestaofut://matches/{matchId}` para essa mesma tela — nenhuma configuração
adicional de linking foi necessária.

Quem de fato dispara esse deep link hoje é `useNotificationListeners`
(ver [notifications.md](notifications.md), "DEEP LINKS") — tocar uma
notificação de jogo aberto, confirmação pendente, oferta de vaga, oferta
expirando ou lembrete de jogo (os cinco tipos que carregam `{ matchId }`)
leva direto para cá, com `ConfirmationButtons` já mostrando o banner de
oferta se for o caso, exatamente como esta seção previa antes de a
notificação existir.

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
  jogo: mostra `RequestParticipationCard` quando é um avulso ativo elegível
  (mesma regra do card da Home), senão mostra uma mensagem neutra em vez de
  esconder a seção silenciosamente.
- **Administração** (só com `match.manage`): `ParticipantsAdminPanel`.

## Painel do administrador ("ADMIN": fila; ordem; ofertas ativas)

Visível só com `match.manage` (o mesmo espelho de permissions de
[multi-tenancy.md](multi-tenancy.md) — o backend responde 403 numa
tentativa de escrita sem essa permission, independentemente do que a UI
mostrar). `buildAdminRoster` (pura, testada isoladamente) separa os
participantes em oito seções:

| Seção                        | Regra                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmados                  | `typeAtMatch=REGULAR`, `status=CONFIRMED`                                                                                                                                                                  |
| Pendentes                    | `typeAtMatch=REGULAR`, `status=PENDING` (estritamente — `WAITLISTED`/`OFFERED` agora têm seções dedicadas abaixo)                                                                                          |
| Ausentes                     | `typeAtMatch=REGULAR`, `status` em `DECLINED`/`CANCELLED`                                                                                                                                                  |
| Goleiros                     | `typeAtMatch=GOALKEEPER`, qualquer status (mostrado com o próprio `Badge` de status — goleiro tem capacidade independente, então "confirmado"/"pendente" precisa aparecer por pessoa, não só por contagem) |
| Avulsos                      | `typeAtMatch=GUEST`, qualquer status                                                                                                                                                                       |
| Fila de espera - linha       | `orderedWaitlist(participants, 'REGULAR')` — `REGULAR` + `GUEST`, `status=WAITLISTED`, numerada na ordem real (`queuePosition`, com `createdAt` como desempate)                                            |
| Fila de espera - goleiros    | O mesmo, restrito ao pool `GOALKEEPER`                                                                                                                                                                     |
| Ofertas ativas               | Todo `status=OFFERED`, ordenado por `offerExpiresAt` ascendente (quem vai expirar primeiro aparece primeiro); cada linha mostra um contador ao vivo via `useCountdown` — mesmo hook do banner do jogador  |

Como `MatchParticipant` só carrega `groupMemberId` (nunca nome/e-mail —
mesma limitação de contrato já documentada em
[multi-tenancy.md](multi-tenancy.md)), cada linha resolve um nome via
`displayNameForMember` (reaproveitado da feature `groups`), cruzando
`groupMemberId → userId` com `useGroupMembers`.

`POOL_TYPES`/`poolForType` em `participant-summary.ts` espelham o mesmo
conceito do backend (`gestaofut-api`'s `POOL_TYPES`): `GUEST` compartilha o
pool `REGULAR` (ocupa a mesma vaga de linha que um mensalista ocuparia),
`GOALKEEPER` é seu próprio pool — é a base de `orderedWaitlist`,
`computeQueueRank` e da contagem de "jogo lotado" usada por
`RequestParticipationCard`.

O painel **não** oferece hoje as ações administrativas excepcionais que a
API já expõe (remover/adicionar/reordenar a fila manualmente, ver
`gestaofut-api docs/matches.md`, "ADMIN") — é só leitura por enquanto; a
seção existe para o pedido atual ("mostrar fila, ordem, ofertas ativas"),
não para editá-las.

## Compartilhar escala

A ação "Compartilhar" do `AdminHome` (ver [home.md](home.md)) não abre
mais o share sheet nativo direto com um resumo montado no cliente — ela
navega para `MatchRosterPreviewScreen`
(`app/matches/[matchId]/roster.tsx`), que segue o fluxo pedido:

1. **Solicitar preview à API** — `useMatchRosterPreview` (uma `useQuery`
   comum) dispara `GET .../matches/:matchId/roster` assim que a tela monta.
2. **Abrir o preview** — a própria tela mostra loading (`"Gerando
   escala..."`) e, quando pronto, **o texto exatamente como veio da API**,
   sem nenhuma transformação no cliente — "o admin vê exatamente o texto
   antes de compartilhar" é literal: não existe um passo intermediário que
   resuma/reformate.
3. **Copiar** — `expo-clipboard`'s `setStringAsync(text)`; o botão mostra
   "Copiado!" por 2s (estado local, `setTimeout`) antes de voltar a
   "Copiar".
4. **Compartilhar** — `Share.share({ message: text })`, a API nativa do
   React Native. O WhatsApp aparece nessa folha de compartilhamento
   sozinho, quando instalado no aparelho — **nenhuma integração própria
   com a API do WhatsApp existe nem foi adicionada**; o app não sabe (nem
   precisa saber) para onde o texto acabou indo.

**Não expõe nada além do texto e dos dois botões** — sem `matchId`, sem
contagens administrativas, sem nenhum dado que o próprio texto já não
tivesse (e o texto em si já é seguro por construção, ver
`gestaofut-api docs/matches.md`, "PRIVACIDADE": sem telefone/email/valor
devido).

### Por que a ação só aparece com um próximo jogo, e some sem `match.manage`

A ação "Compartilhar" em `AdminHome` (`src/features/home/components/AdminHome.tsx`)
agora exige explicitamente `can('match.manage')` — antes ela não tinha
gate nenhum, porque só compartilhava um resumo genérico já visível a
qualquer um. Como a rota real (`GET .../roster`) é gated por
`match.manage` no servidor (ver `gestaofut-api docs/matches.md`, "ESCALA
COMPARTILHÁVEL" — inclui um sinal de pago/não-pago, uma divulgação
financeira mínima), esconder o botão para quem não tem essa permission
evita um 403 inútil. A ação também só aparece quando
`dashboard.nextMatch` existe — sem jogo, não há escala para gerar.

### TESTES

- `useMatchRoster.test.tsx` — a query em si (habilitação condicional,
  propagação de erro).
- `MatchRosterPreviewScreen.test.tsx` — geração (loading → texto exato),
  erro (genérico e o 403 de permissão, com retry), copiar (clipboard +
  feedback temporário), compartilhar (payload exato para `Share.share`,
  e que uma folha de compartilhamento cancelada não vira um erro exibido),
  e a ausência de qualquer metadado administrativo na tela.
- `AdminHome.test.tsx` — a ação só aparece com `match.manage` **e** um
  próximo jogo; ao pressionar, navega para a rota de preview com o
  `matchId` certo (nunca compartilha direto da Home).

## Limitações conhecidas do contrato atual

- **Sem paginação** em `GET /matches` (ver acima).
- **Sem edição da fila pelo admin no cliente** — a API já permite
  remover/adicionar/reordenar manualmente (ver acima), mas a UI ainda só
  lê essas informações.
