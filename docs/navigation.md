# Navegação (Expo Router)

## Grupos

```text
app/
  _layout.tsx      Providers globais + <Stack> raiz
  index.tsx        Redireciona para (app) ou (auth)/login conforme sessão
  (auth)/          Fluxo não autenticado
    _layout.tsx    <Stack headerShown={false}>
    login.tsx
    register.tsx
  (app)/           Fluxo autenticado
    _layout.tsx    <Tabs>
    index.tsx      Início
    games.tsx      Jogos (placeholder)
    players.tsx    Jogadores (placeholder)
    finance.tsx    Financeiro (placeholder)
    more.tsx       Mais (com "Sair")
```

## Como a sessão decide o grupo

`app/index.tsx` lê `useAuthStore` e renderiza `<Redirect>` para
`/(app)` ou `/(auth)/login`. O estado de sessão (`loading` → `authenticated`
| `unauthenticated`) vem de `src/hooks/useBootstrapAuth.ts`, que lê o
refresh token do Expo SecureStore uma única vez na inicialização e, se
houver um, chama `POST /auth/refresh` para validar e renovar a sessão (ver
[state-management.md](state-management.md) para o fluxo completo). Enquanto
isso não resolve (`loading`), `app/_layout.tsx` mantém a splash screen
visível (`SplashScreen.preventAutoHideAsync`) para não piscar a tela errada.

A validade do token nunca é decidida no cliente — quem decide é sempre a
resposta do `gestaofut-api` a `/auth/refresh` (ver `docs/security.md` desse
repositório).

## Tabs

`(app)/_layout.tsx` define as 5 tabs previstas no produto (Início, Jogos,
Jogadores, Financeiro, Mais) usando `@expo/vector-icons` (Ionicons outline).
Apenas Início e Mais têm uma tela "real" nesta etapa; as demais renderizam
`src/components/common/ComingSoonScreen.tsx` (reuso do `EmptyState` do design
system) — a shell de navegação já existe, sem antecipar as features.

## Adicionando uma rota nova

1. Criar a screen em `src/features/<nome>/screens/`.
2. Criar o arquivo em `app/(app)/<nome>.tsx` (ou `app/(app)/<nome>/[id].tsx`
   para rota dinâmica) que só importa e renderiza essa screen.
3. Se for uma nova tab, adicionar um `<Tabs.Screen>` em `(app)/_layout.tsx`.

Nunca escrever lógica de navegação condicional (ex.: `if (user.role === ...)`)
dentro de um arquivo de `app/` — isso pertence à screen ou a um hook de
feature.
