# Desenvolvimento

## Requisitos

- Node.js 24+
- pnpm 9+ (`corepack enable` ou `npm i -g pnpm`)
- Android Studio (emulador/SDK) e/ou Xcode (simulador iOS, macOS apenas)

## Setup

```bash
cp .env.example .env
pnpm install

pnpm start        # Metro / Expo Dev Tools
pnpm android      # abre no Android
pnpm ios          # abre no iOS (macOS apenas)
```

## Versões (importante)

O projeto está na borda mais recente do Expo (SDK 57, React Native 0.86,
React 19.2, TypeScript 6) — publicado muito depois da maioria dos guias
genéricos sobre Expo. Ao adicionar uma dependência:

- Pacotes gerenciados pelo Expo (`expo-*`, `react-native-*` que fazem parte
  do SDK): sempre `npx expo install <pacote>`, nunca `pnpm add` direto — isso
  resolve a versão compatível com o SDK instalado.
- Pacotes fora do SDK (TanStack Query, Zustand, RHF, Zod, ferramentas de
  lint/teste): `pnpm add`, mas **confira a versão** contra o que o resto do
  toolchain espera antes de aceitar "latest" às cegas. Duas armadilhas reais
  já encontradas neste projeto:
  - `eslint@10` quebra `eslint-config-expo` (que ainda espera ESLint 9.x) —
    fixado em `^9.0.0`.
  - `jest@30` quebra `jest-expo` (que empacota `@jest/*` na linha 29.x) —
    fixado em `^29.7.0`, com `@types/jest` na mesma linha.
  - `@testing-library/react-native@14` trocou o renderer de teste de
    `react-test-renderer` para o pacote `test-renderer`; nesta base optamos
    por fixar em `13.3.3` (com `react-test-renderer`), por ser a combinação
    validada e estável com React 19.2/RN 0.86 no momento.

Rode `npx expo-doctor` depois de mexer em dependências — ele pega
incompatibilidades de versão e duplicatas antes delas virarem bug em
runtime.

## Testes

```bash
pnpm test          # Jest (jest-expo) + React Native Testing Library
pnpm test:watch
```

- `jest.setup.js` define `EXPO_PUBLIC_API_URL` padrão e mocka
  `expo-secure-store` (não há Keychain/Keystore real em ambiente de teste).
- Testes cobrem: componentes do design system (`Button`, `EmptyState`),
  `auth-store`, `ApiError`, `loginSchema` (Zod) e o util `delay`.

## Lint / typecheck / build

```bash
pnpm lint        # expo lint (eslint-config-expo)
pnpm typecheck   # tsc --noEmit
pnpm format      # prettier --write
```

Validação de bundle (sem precisar de emulador/simulador):

```bash
npx expo export --platform android --platform ios
```

Isso resolve o grafo de módulos completo para os dois alvos e falha alto se
houver import quebrado/erro de runtime na inicialização — útil como
verificação rápida em CI ou num ambiente sem Android Studio/Xcode.

## Rodando num dispositivo/emulador real

Em ambientes sem GUI estável (ex.: containers, CI, ou — como observado ao
validar esta fundação — sessões de terminal onde um emulador Android
iniciado em background pode ser encerrado entre comandos), prefira:

1. `npx expo-doctor` + `npx expo export --platform android --platform ios`
   como verificação primária (feito nesta entrega).
2. Um emulador/simulador real, aberto interativamente (`pnpm android` /
   `pnpm ios`) numa máquina de desenvolvimento normal, para o smoke test
   visual final antes de publicar.

iOS especificamente só pode ser buildado/rodado nativamente em macOS —
noutro SO, `expo export --platform ios` ainda valida o bundle JS, mas não
substitui rodar no Simulator.

## Adicionando uma feature

Ver [architecture.md](architecture.md#regra-central-rotas-finas) e
[navigation.md](navigation.md#adicionando-uma-rota-nova).
