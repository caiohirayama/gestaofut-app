# Notificações (push + central in-app)

Consome o módulo `notifications` do `gestaofut-api` (`/me/notifications`,
`/me/push-subscriptions` — ver o `docs/notifications.md` desse repositório).
Este app nunca fala com o Expo Push Service diretamente para *enviar* nada —
só para *obter* o Expo Push Token do próprio dispositivo
(`getExpoPushTokenAsync`) e registrá-lo na API; quem efetivamente dispara
cada push é o worker do `gestaofut-api`.

## Onde cada pedaço mora

```text
src/features/notifications/          genérico — nenhuma tela específica de um evento aqui
  utils/
    push-permission.ts       getPushPermissionStatus / requestPushPermission (+ canal Android)
    push-token.ts             getExpoPushToken — Device.isDevice + projectId + Notifications.getExpoPushTokenAsync
    notification-deep-link.ts  data (matchId/eventId/monthlyFeeId) -> Href do expo-router
    notification-labels.ts     rótulo + ícone por NotificationType
    notification-datetime.ts   formatação de data/hora da lista
    notification-lists.ts      partição pura não lidas / lidas
  hooks/
    usePushPermission.ts        estado do permission (loading/granted/denied/undetermined) + request()/refresh()
    useRegisterPushDevice.ts    obtém o token e chama POST /me/push-subscriptions; revoke()
    useAutoRegisterPushDevice.ts  silenciosamente re-registra se a permissão já estava concedida
    useNotificationListeners.ts   FOREGROUND + DEEP LINKS — handler global, tap, cold start
    useNotifications.ts          GET /me/notifications (React Query)
    useMarkNotificationRead.ts   POST /me/notifications/:id/read (React Query)
  components/
    NotificationListRow.tsx        linha da lista — memoizada, mesmo padrão de MatchListRow
    NotificationPermissionBanner.tsx  pedido contextual de permissão + revogação
  screens/
    NotificationsScreen.tsx     NOTIFICATION CENTER — não lidas / lidas / marcar como lida
src/services/api/endpoints/notifications.ts   AppNotification, PushSubscription, listNotifications, markNotificationRead, registerPushSubscription, revokePushSubscription
src/services/secure-storage.ts   SECURE_KEYS.pushSubscriptionId (novo)
app/notifications.tsx             rota — fora de (app)/, empilhada por cima das tabs (ver docs/navigation.md)
app/_layout.tsx                    useNotificationListeners() — roda uma vez, cedo, para capturar cold start
app/(app)/_layout.tsx              useAutoRegisterPushDevice() — só depois de autenticado
```

## PERMISSION

**Nunca solicitada na primeira tela.** `usePushPermission` só *lê* o status
do sistema operacional ao montar (sem prompt); quem efetivamente pede é
`NotificationPermissionBanner`, e essa banner só existe dentro de
`NotificationsScreen` — ou seja, o pedido só acontece quando o usuário já
abriu a própria central de notificações, o contexto mais direto possível
para a pergunta "quer ativar notificações?". Nenhum efeito de app-start
chama `requestPushPermission()`.

Três estados, três UIs diferentes na mesma banner:

| `PushPermissionStatus` | O que a banner mostra |
| --- | --- |
| `undetermined` | "Ative as notificações" + botão que chama `request()` |
| `denied` | Aviso de que já foi negado (o SO nunca reabre o diálogo nativo sozinho) + botão "Abrir configurações" (`Linking.openSettings()`) |
| `granted` | "Notificações por push ativadas" + link "Desativar" ("PERMITIR REVOGAÇÃO") |

## DEVICE

**Registro só depois de autorização**: `handleRequestPermission` (na
screen) só chama `useRegisterPushDevice().register()` **depois** que
`request()` retorna `'granted'` — nunca antes, e nunca tenta obter um token
com a permissão ainda `undetermined`/`denied` (o próprio SO recusaria).

`getExpoPushToken()` (`utils/push-token.ts`) resolve para um de cinco
estados, nunca lança:

```text
obtained             { token, platform }               -> POST /me/push-subscriptions
unsupported-device   Device.isDevice === false          -> simulador/emulador, sem capacidade de push
missing-project-id   sem extra.eas.projectId no app.json -> projeto ainda não linkado ao EAS (ver "Limitações")
error                 getExpoPushTokenAsync rejeitou      -> mensagem genérica, nunca crasha a tela
```

**"Atualizar quando necessário"**: `useAutoRegisterPushDevice` (chamado uma
vez em `app/(app)/_layout.tsx`, só depois que a sessão já está
autenticada) lê o `PushPermissionStatus` atual e, se já for `granted` (de
uma sessão anterior), chama `register()` de novo silenciosamente — cobre
token rotacionado/reinstalação sem o usuário precisar visitar a central de
notificações. `registerPushSubscription` no `gestaofut-api` já faz upsert
por token (`ON CONFLICT (token) DO UPDATE`), então repetir o registro
nunca duplica nada — ver o `docs/notifications.md` desse repositório,
"PUSH".

**"Permitir revogação"**: `useRegisterPushDevice().revoke()` lê o
`PushSubscription.id` lembrado localmente (`SecureStore`,
`SECURE_KEYS.pushSubscriptionId` — guardado só como um ponteiro para poder
revogar depois, nunca como prova de que o push está de fato ativo; quem
decide isso é sempre o SO) e chama `POST .../revoke`. É *best-effort*:
mesmo se a chamada à API falhar (já revogado, rede fora do ar), o ponteiro
local é esquecido de qualquer jeito — a UI nunca fica presa oferecendo
"desativar" algo que não consegue mais alcançar.

## DEEP LINKS

`resolveNotificationDeepLink(data)` (`utils/notification-deep-link.ts`) é
uma função pura que resolve **direto dos ids em `data`**, nunca do
`NotificationType`:

```text
{ matchId }        -> /matches/[matchId]   (MATCH_OPENED, CONFIRMATION_PENDING, WAITLIST_OFFER, OFFER_EXPIRING, MATCH_REMINDER — os cinco caem no mesmo lugar)
{ eventId }        -> /events/[eventId]
{ monthlyFeeId }   -> /my-finance          (ainda não existe uma tela de detalhe por mensalidade)
sem nenhum dos três -> /notifications      (fallback: a própria central)
```

Ramificar por `type` primeiro seria só cinco `case`s convergindo na mesma
rota — verificar qual id existe em `data` já resolve isso em uma função só,
e a mesma função funciona tanto para uma notificação tocada dentro do app
quanto para um push tocado fora dele, porque as duas fontes têm exatamente
esse mesmo formato de `data` (é o `gestaofut-api` quem o popula — ver seu
próprio `docs/notifications.md`, "EVENTOS" — e o Expo simplesmente ecoa o
`data` de volta na notificação recebida/tocada).

**Três momentos, uma função (`useNotificationListeners`)**:

1. **Tap com o app aberto/em background** —
   `Notifications.addNotificationResponseReceivedListener`.
2. **Cold start** — o app foi *aberto* pelo toque na notificação (estava
   fechado); o listener acima não existia ainda para capturar isso, então
   `Notifications.getLastNotificationResponseAsync()` é consultado uma vez,
   ao montar.
3. Ambos chamam a mesma `deepLinkFromNotification`, que só navega
   (`router.push`) se `useAuthStore.getState().status === 'authenticated'`
   — um token ficou no dispositivo de uma sessão anterior não deve abrir
   uma tela que vai só falhar sem sessão.

A rota `/matches/[matchId]` já existia preparada para isso exatamente (ver
[matches.md](matches.md), "Deep link") — nenhuma mudança de rota foi
necessária, só o disparo.

## FOREGROUND

`Notifications.setNotificationHandler` (registrado uma vez, no escopo do
módulo de `useNotificationListeners.ts` — mesma ideia de
`SplashScreen.preventAutoHideAsync()` no topo de `app/_layout.tsx`) faz o
SO continuar mostrando banner/som mesmo com o app já aberto — o
comportamento padrão do Expo Notifications é **não** mostrar nada nesse
caso, o que pareceria "a notificação sumiu". Além do banner nativo,
`addNotificationReceivedListener` invalida o cache do React Query
(`queryKeys.notifications.all`) — a central de notificações e o badge de
não lidas em `MoreScreen` refletem a novidade sem precisar de
pull-to-refresh manual.

## NOTIFICATION CENTER

`NotificationsScreen` (rota `/notifications`, alcançada por um card em
`MoreScreen` com badge de contagem de não lidas) segue exatamente o padrão
de `GamesScreen`: uma única busca (`useNotifications()`, sem filtro de
servidor) particionada no cliente em duas abas via `ChipSelect` —
`unreadNotifications`/`readNotifications` (`utils/notification-lists.ts`,
puras e testadas isoladamente, mesmo molde de `upcomingMatches`/
`matchHistory`).

**"Marcar como lida"** acontece ao tocar a linha (não é uma ação separada):
se a notificação ainda não foi lida, `useMarkNotificationRead().mutate(id)`
é disparado (patch otimista nas duas listas em cache — a linha some da aba
"Não lidas" e ganha `readAt` na aba "Todas"/histórico); tocar uma linha já
lida não chama a API de novo. Em seguida, se `resolveNotificationDeepLink`
achar um destino mais específico que a própria central, navega para lá.

## SEGURANÇA

Este app nunca decide o que aparece no texto de um push — `title`/`body`
vêm prontos do `gestaofut-api`, que já garante nenhum valor monetário
neles (ver o `docs/notifications.md` desse repositório, "SEGURANÇA"). O
único cuidado do lado do app é não *adicionar* informação sensível ao que
fica visível: `NotificationListRow` mostra só `title`/`body`/`data` (ids de
navegação, nunca um valor), e a mesma régua vale para o texto nativo do
push (que o app nem controla, só recebe).

## TESTES

| Área | Onde |
| --- | --- |
| Permissões (estados, canal Android, refresh) | `push-permission.test.ts`, `usePushPermission.test.tsx` |
| Token registration (obtido/simulador/sem projectId/erro, upsert, revoke best-effort) | `push-token.test.ts`, `push-token.unsupported-device.test.ts`, `useRegisterPushDevice.test.tsx` |
| Deep link (resolução pura + tap + cold start + gate de autenticação) | `notification-deep-link.test.ts`, `useNotificationListeners.test.tsx`, `NotificationsScreen.test.tsx` |
| Foreground (handler global + invalidação de cache) | `useNotificationListeners.test.tsx` |
| Estados da UI (não lida/lida, banner por status de permissão, loading/erro/vazio) | `NotificationListRow.test.tsx`, `NotificationPermissionBanner.test.tsx`, `NotificationsScreen.test.tsx` |
| Marcar como lida (patch otimista, não duplica chamada) | `NotificationsScreen.test.tsx` |

## Limitações conhecidas do contrato atual

- **Exige `expo.extra.eas.projectId` em `app.json`** — preenchido
  automaticamente por `eas init`; até isso ser feito, `getExpoPushToken()`
  resolve `missing-project-id` e a tela mostra o estado correspondente, sem
  quebrar.
- **Sem tela de detalhe por mensalidade** — `MONTHLY_FEE_GENERATED` só
  chega até `/my-finance`, nunca uma mensalidade específica.
- **Sem preferências por tipo de evento** — ativar/desativar é tudo ou
  nada (o mesmo limite já documentado no `gestaofut-api`).
- **Badge de não lidas em `MoreScreen` é uma segunda leitura** (`GET
  /me/notifications?unreadOnly=true`) separada da lista da própria
  `NotificationsScreen` — aceitável pelo volume esperado; não há um
  endpoint de "só a contagem" no contrato atual.
