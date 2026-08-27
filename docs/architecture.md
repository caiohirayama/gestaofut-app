# Arquitetura

## Estrutura de pastas

```text
app/                      Expo Router — apenas rotas finas
  _layout.tsx              Root: providers, splash/bootstrap, <Stack>
  index.tsx                 Redirect (auth) vs (app) conforme sessão
  (auth)/
    _layout.tsx
    login.tsx                → monta src/features/auth/screens/LoginScreen
  (app)/
    _layout.tsx              <Tabs> (Início/Jogos/Jogadores/Financeiro/Mais)
    index.tsx, games.tsx, ... → montam telas de src/features/*

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

## Módulo `system` de referência

Não é uma feature de produto — existe para provar a arquitetura ponta a
ponta com algo real e de baixo risco: `src/features/home/hooks/useApiStatus.ts`
usa TanStack Query para chamar `GET /health` do `gestaofut-api` e
`HomeScreen` exibe o resultado com os estados loading/error do design
system. Isso valida cliente HTTP, TanStack Query e design system juntos sem
inventar dados de negócio.

## Por que este é um bom ponto de partida

- Cada peça (design system, cliente HTTP, store, navegação) é testável
  isoladamente.
- Adicionar uma feature real (jogos, jogadores, financeiro) significa criar
  uma pasta em `src/features/<nome>/` e registrar suas rotas — não exige
  mudar nada da fundação.
- Nenhuma decisão aqui pressupõe como o backend de autenticação/negócio vai
  se parecer, exceto o contrato mínimo já validado (`/health`, `/api/v1`).
