# Eventos (churrasco e outros)

Consome o módulo `events` do `gestaofut-api` (ver o `docs/events.md` desse
repositório) — domínio genérico (`BARBECUE`/`SOCIAL`/`TOURNAMENT`/`OTHER`),
nenhuma tela ou tipo aqui é específico de churrasco além dos rótulos/emoji.

## Onde cada pedaço mora

```text
src/services/api/endpoints/events.ts   Tipos + chamadas HTTP (espelha o contrato do gestaofut-api)
src/features/events/
  utils/
    event-labels.ts               labels/emoji/variantes de Badge para os enums (tipo, status, status de participante)
    event-datetime.ts             formatação de data/hora — puro
    event-lists.ts                upcomingEvents/eventHistory/pickNextEvent — puro, mesmo racional de match-lists.ts
    event-summary.ts              countConfirmedParticipants (conta CONFIRMED + ATTENDED)
    event-status-transitions.ts   mapeia o status atual → { próximo status, rótulo do botão } — espelha ALLOWED_SOURCE_STATUSES do backend
    event-error-message.ts        mensagem amigável para o 409 de transição inválida
    event-form-datetime.ts        combina data (DD/MM/AAAA) + hora (HH:MM) + duração em um par startsAt/endsAt ISO
  schemas/
    event-form-schema.ts          validação do formulário de criar/editar evento
  hooks/
    useEvents.ts                  lista (sem filtro) + detalhe + criar/editar
    useEventParticipants.ts       lista de participantes + convidar/confirmar/recusar/cancelar/presença/falta
    useMyEventParticipant.ts      deriva "minha" participação (groupMemberId → userId → me), mesmo padrão de useMyMatchParticipant
    useMyEventEntitlement.ts      "Incluso na mensalidade" — GET .../entitlements/me
  components/
    EventConfirmationButtons.tsx  "Vou" / "Não vou" / "Não vou mais" — versão mais simples de ConfirmationButtons (sem fila/oferta)
    EventListRow.tsx              linha da lista de eventos
    EventParticipantsPanel.tsx    roster somente leitura para quem tem event.manage
  screens/
    EventsListScreen.tsx          lista: próximos + histórico, + criar evento (event.manage)
    EventDetailScreen.tsx         detalhe completo + confirmação + administração
    EventFormScreen.tsx           formulário compartilhado entre criar e editar
app/events/index.tsx              rota da lista
app/events/[eventId].tsx          rota de detalhe
app/events/create.tsx             rota de criação (event.manage)
app/events/[eventId]/edit.tsx     rota de edição (event.manage)
```

## Por que não há uma 6ª aba

Ao contrário de Financeiro (pedido explicitamente como tab), Eventos vive
como uma entrada em "Mais" (`MoreScreen`) + um card na Home (para quem tem
um evento próximo) + rotas dedicadas (`app/events/...`). O card da Home
cobre o caso de uso mais frequente (ver o evento em destaque e confirmar
ali mesmo); a lista completa fica a um toque de distância em "Mais".

## O evento em destaque (Home)

Desde a reconstrução da Home sobre o dashboard agregado (ver
[home.md](home.md)), "qual é o próximo evento" é decidido por
`gestaofut-api`'s `GET .../dashboard`
(`EventRepository.findNextUpcoming`, mesmos status `DRAFT`/`OPEN`/`CLOSED`
que `upcomingEvents` já usava aqui) — não mais um componente buscando a
lista inteira do grupo (`useEvents`) client-side. `MemberNextEventCard`
(admin) e a linha correspondente em `AdminAlertsCard` (`src/features/home/`)
são quem efetivamente mostra isso hoje; quando não há evento próximo,
nenhum dos dois renderiza um card vazio — eventos continuam sendo um
destaque opcional, não o centro da tela.

O emoji vem de `EVENT_TYPE_EMOJI[event.type]` — a única variação visual por
tipo, mantendo o resto do design system idêntico ("identidade visual
levemente diferente" sem duplicar componentes). A contagem de confirmados
já vem pronta do dashboard (`nextEvent.confirmed`); o card do jogador ainda
faz uma segunda query própria (`useMyEventParticipant`/
`useMyEventEntitlement`) só para a participação/benefício do próprio
usuário, que o dashboard nunca expõe (ver gestaofut-api docs/dashboard.md
— o endpoint é sempre agregado, nunca individual).

## Detalhes do evento

`EventDetailScreen` mostra, em cards separados:

- **Informações**: tipo, local (ou "A definir"), descrição (se houver) e,
  quando `useMyEventEntitlement` resolve uma entitlement não revogada, um
  selo "Incluso na mensalidade" — nunca mostrado para quem não tem o
  benefício (não existe "não incluso" explícito, só a ausência do selo).
- **Sua participação**: `EventConfirmationButtons` para quem tem um
  `EventParticipant`; uma mensagem neutra ("Você não foi convidado para
  este evento.") para quem não tem — nunca esconde a seção silenciosamente,
  mesmo padrão de `MatchDetailsScreen`.
- **Administração** (só com `event.manage`): editar, avançar o status,
  cancelar, e o roster de participantes (`EventParticipantsPanel`).

## Confirmar / recusar / cancelar — mais simples que jogos

`EventConfirmationButtons` não tem fila nem oferta (`EventParticipant` não
tem esses conceitos) — só três transições, mirror de
`ALLOWED_SOURCE_STATUSES` do backend:

| Status atual                          | O que aparece                                    | Ação do botão "negativo" |
| -------------------------------------- | -------------------------------------------------- | ------------------------- |
| `INVITED`                              | "Vou" + "Não vou"                                  | `decline`                 |
| `CONFIRMED`                            | Selo "Presença confirmada" + "Não vou mais"        | `cancel`                  |
| `DECLINED`/`CANCELLED`/`ATTENDED`/`NO_SHOW` | Texto informativo, sem botão                  | —                          |

`ATTENDED`/`NO_SHOW` são sempre marcados pelo admin (nunca aparecem como
opção aqui) — a API rejeitaria a tentativa de um participante se auto-marcar
com 403, mesmo padrão de "esconder o que o backend rejeitaria" documentado
em [state-management.md](state-management.md). Double submit é prevenido
desabilitando os dois botões enquanto qualquer uma das três mutations está
em andamento — mesmo padrão de `ConfirmationButtons`.

**Não há confirmação self-service** — diferente de `matches` (onde um
`GUEST` pode pedir para entrar sozinho), um `EventParticipant` só existe
depois de um convite explícito do admin (`inviteEventParticipant`, sem
endpoint de auto-inscrição no backend). A tela mostra a mensagem neutra em
vez de um botão de "entrar" nesse caso.

## Administração — criar, editar, avançar status, cancelar

Um evento sempre nasce `DRAFT` (o backend não aceita "criar já aberto").
`event-status-transitions.ts` espelha `ALLOWED_SOURCE_STATUSES` do
`gestaofut-api` para decidir qual botão de avanço mostrar:

| Status atual | Botão mostrado          | Novo status |
| ------------- | ------------------------ | ----------- |
| `DRAFT`       | "Abrir confirmações"     | `OPEN`      |
| `OPEN`        | "Encerrar confirmações"  | `CLOSED`    |
| `CLOSED`      | "Finalizar evento"       | `FINISHED`  |
| `FINISHED`/`CANCELLED` | nenhum          | —           |

"Cancelar evento" aparece para qualquer status não-terminal
(`DRAFT`/`OPEN`/`CLOSED`) atrás de uma confirmação nativa (`Alert.alert`,
mesmo padrão de ação destrutiva já usado em `PendingItemRow`/
`PlayerDetailScreen`) — cancelar não é reversível pela API. Note que a
confirmação de presença (`EventConfirmationButtons`) **não depende** do
status do evento — o backend aceita confirmar/recusar independentemente de
`DRAFT`/`OPEN`/etc. (ver `gestaofut-api docs/events.md`); os botões de
avanço de status existem só para o ciclo de vida administrativo do
evento em si (quando ele aparece como "aberto" vs. "encerrado" na UI), não
como um gate de autorização.

"Editar evento" (`event.manage`) navega para `app/events/[eventId]/edit.tsx`,
que reaproveita `EventFormScreen` (o mesmo componente da criação) — o
formulário usa `values:` do React Hook Form para pré-preencher
reativamente a partir do evento carregado (mesmo padrão de
`GroupSettingsScreen`), convertendo `startsAt`/`endsAt` de volta para os
campos de texto via `toDateInput`/`toTimeInput`/`durationInMinutes`.

## Formulário de criar/editar evento — sem dependência de date picker

O app ainda não tem nenhuma biblioteca de seleção de data/hora (jogos nunca
precisaram de um formulário de criação — são gerados no servidor). Em vez
de adicionar uma dependência só para esta tela, o formulário usa três
campos de texto simples e validados (`event-form-schema.ts`):
`date` (`DD/MM/AAAA`), `startTime` (`HH:MM`) e `durationMinutes` (inteiro
positivo, como string — mesmo padrão dos campos numéricos de
`group-settings-schema.ts`). `event-form-datetime.ts`'s `toEventDates`
combina os três num par `{startsAt, endsAt}` ISO só no momento do submit,
usando o fuso horário local do dispositivo (a pessoa criando o evento está
presumivelmente nele).

## "Incluso na mensalidade"

`useMyEventEntitlement` chama `GET .../entitlements/me` — um endpoint
`group.read` (qualquer membro pode consultar a própria entitlement; a
listagem completa por evento continua exigindo `event.manage`, ver
`gestaofut-api docs/events.md`). Esse endpoint precisou ser adicionado no
`gestaofut-api` durante esta mesma tarefa: antes só existia
`GET .../entitlements` (admin-only), o que tornaria essa parte da tela
impossível para um mensalista comum verificar o próprio benefício.

## Permissions

Mesma mecânica de [multi-tenancy.md](multi-tenancy.md) — `can('event.manage')`
é só uma dica de UI (esconde botões administrativos); toda mutation
passa pelo backend, que responde 403 de verdade se a permission não bater.
`EventsListScreen` esconde o botão "criar evento"; `EventDetailScreen`
esconde a seção inteira de "Administração" (editar, avançar status,
cancelar, roster).

## Limitações conhecidas do contrato atual

- **Sem paginação/filtro de servidor** em `GET /events`, mesma limitação de
  `matches` — `upcomingEvents`/`eventHistory` particionam client-side.
- **Roster de participantes é só leitura no app** — o backend já expõe
  convidar/marcar presença/falta (`inviteEventParticipant`,
  `markEventParticipantAttended`, `markEventParticipantNoShow`, todos com
  hooks prontos em `useEventParticipants.ts`), mas a tela atual só pede
  "visualizar participantes"; não há UI para essas ações ainda.
- **Sem UI de churrasco mensal automático** — `suggestBarbecueDate` e a
  concessão de entitlement em lote (`grantMonthlyBarbecueEntitlements`)
  existem só no backend (rodados via script/job), sem uma tela
  administrativa para dispará-los manualmente pelo app.
