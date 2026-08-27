# Design System

## Princípios visuais

Moderno, premium, esportivo, clean, profissional — evitando aparência
infantil e excesso de gradientes/neon/sombras/animações/cores. Na prática:

- **Uma paleta restrita**: neutros (fundo/superfície/texto) + um único
  accent confiante (verde "campo", `#0F7A4B`) + cores semânticas mínimas
  (sucesso, aviso, erro). Ver `src/theme/colors.ts`.
- **Sem sombra**: `Card` usa borda de 1px em vez de `shadow*`/`elevation`.
- **Sem gradientes/neon**: nenhum componente usa `LinearGradient` ou cores
  saturadas de destaque.
- **Fonte do sistema**: `San Francisco` (iOS) / `Roboto` (Android) via
  `Platform.select`, sem carregar fonte customizada nesta etapa — já lê como
  clean/profissional e evita lidar com FOUC/`expo-font` splash agora.
- **Touch targets**: `touchTarget.min = 44` (iOS HIG / Material) aplicado em
  `Button` e `Input`.

## Por que não uma lib de UI pronta

O pedido é uma base própria, não uma biblioteca gigante. Todos os componentes
em `src/components/ui/` são RN puro + `StyleSheet`, sem dependência de UI kit.

## NativeWind

Avaliado e **não adotado nesta etapa**: a stack já está na borda mais nova do
ecossistema (Expo SDK 57, React Native 0.86, React 19.2 — ver
`docs/development.md` sobre versões), e adicionar NativeWind introduziria uma
segunda camada de build (Tailwind + babel/metro plugin) cuja estabilidade com
essa combinação específica não pôde ser validada no ambiente disponível. Os
tokens em `src/theme/` cumprem o mesmo papel (fonte única de verdade para
cor/espaçamento/tipografia) sem esse risco. Pode ser reavaliado quando a
combinação de versões estiver mais assentada.

## Componentes (`src/components/ui/`)

| Componente | Papel |
| --- | --- |
| `Screen` | Container raiz: safe-area, padding e background consistentes; `scroll` opcional |
| `Text` | Único primitivo de texto; variantes (`title`, `subtitle`, `body`, `bodyStrong`, `caption`, `label`) |
| `Button` | Variantes `primary/secondary/ghost/danger`; estados `loading`/`disabled` obrigatórios |
| `Input` | Compatível com `Controller` do React Hook Form; `label`/`error`/`helperText` |
| `Card` | Superfície com borda, sem sombra |
| `Badge` | Rótulo curto (ex.: status "Online"/"Indisponível") |
| `Avatar` | Imagem com fallback de iniciais |
| `Divider` | Linha de separação (`hairlineWidth`) |
| `LoadingState` | Estado de carregamento de uma seção/tela |
| `ErrorState` | Estado de erro com retry opcional |
| `EmptyState` | Estado vazio/"em breve" (reusado por `ComingSoonScreen`) |

Todos exportados por `src/components/ui/index.ts`.

## Tokens (`src/theme/`)

- `colors.ts` — paleta completa, tipada (`ColorToken`).
- `spacing.ts` — escala `xs..xxxl` (múltiplos de 4) + `radius` + `touchTarget`.
- `typography.ts` — `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`.

Nenhum componente usa valores mágicos de cor/espaçamento — sempre os tokens.
