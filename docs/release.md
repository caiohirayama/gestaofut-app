# Release (EAS Build)

Este documento prepara o processo de build com EAS para três ambientes —
`development`, `preview`, `production` — **sem publicar nada nas lojas**.
Nenhum comando `eas build`/`eas submit` foi executado como parte desta
revisão; o que existe aqui é configuração, pronta para o time rodar quando
decidir.

## Os três ambientes

| Perfil (`eas.json`) | Uso | Distribuição | Identificador (iOS/Android) |
| --- | --- | --- | --- |
| `development` | Dev client, conectado ao Metro local | `internal` | `com.hymatech.gestaofut.dev` |
| `development-simulator` | Igual, mas gera build para simulador iOS (sem conta Apple paga) | `internal` | `com.hymatech.gestaofut.dev` |
| `preview` | Build completo (JS embutido), para QA/stakeholders | `internal` | `com.hymatech.gestaofut.preview` |
| `production` | Build de loja | `store` (implícito) | `com.hymatech.gestaofut` |

**Por que identificadores diferentes por ambiente**: `development`/
`preview` recebem um sufixo (`.dev`/`.preview`) no `bundleIdentifier`
(iOS) e `package` (Android), e o nome do app ganha um sufixo visível
("GestãoFut (Dev)"/"GestãoFut (Preview)"). Isso permite instalar um build
de desenvolvimento **ao lado** de uma instalação de produção no mesmo
aparelho, sem um substituir o outro — essencial para testar uma build nova
sem perder a sessão/app de produção que já está no celular do QA.

## Como isso é implementado

`app.json` continua sendo a fonte de verdade estática (nome base,
`scheme`, ícones, plugins) — nada disso muda por ambiente. `app.config.ts`
(dynamic config — [documentação oficial](https://docs.expo.dev/workflow/configuration/#dynamic-configuration))
lê a variável `APP_VARIANT` (setada por perfil em `eas.json`, via
`build.<perfil>.env.APP_VARIANT`) e só sobrescreve `name`/
`ios.bundleIdentifier`/`android.package` com o sufixo correspondente —
tudo o mais vem de `app.json` sem alteração.

```bash
# Conferir o que cada ambiente resolve, sem buildar nada:
npx expo config --type public                        # production (padrão, sem APP_VARIANT)
APP_VARIANT=development npx expo config --type public
APP_VARIANT=preview npx expo config --type public
```

`EXPO_PUBLIC_API_URL` também varia por perfil (`eas.json`,
`build.<perfil>.env`) — `development` aponta para `localhost`, `preview`
para o staging (`api-staging.gestaofut.com.br`), `production` para a API
real. Ver [docs/api-client.md](api-client.md) e o `.env.example` para o
equivalente em desenvolvimento local (fora de EAS Build).

## Preparando para buildar (quando o time decidir)

**Pré-requisitos, uma única vez por projeto**:

```bash
npm install -g eas-cli   # ou npx eas-cli, sem instalar globalmente
eas login                 # conta Expo/EAS da organização
eas init                  # associa este projeto a um projeto EAS (preenche
                           # expo.extra.eas.projectId em app.json — necessário
                           # para push notifications funcionarem de verdade,
                           # ver docs/notifications.md)
```

**iOS**: exige uma conta Apple Developer paga para builds de dispositivo
físico ou envio à loja — `development-simulator` funciona sem isso
(gera um `.app` para o Simulator). Ao rodar `eas build --platform ios`
pela primeira vez, o EAS oferece gerenciar certificados/perfis de
provisionamento automaticamente ("Expo-managed credentials") — recomendado
para não lidar com Keychain/certificados manualmente.

**Android**: EAS gera e gerencia um keystore automaticamente no primeiro
build (perguntará se você quer que o EAS gerencie as credenciais) — não é
necessário ter um keystore próprio para builds `internal`/`preview`; para
`production`, o mesmo keystore deve ser reutilizado em todo build seguinte
(o EAS já cuida disso, mantendo o keystore por projeto).

**Comandos de build** (não executados nesta revisão):

```bash
eas build --profile development --platform android   # dev client, instala via link/QR
eas build --profile development-simulator --platform ios
eas build --profile preview --platform all            # build completo para QA
eas build --profile production --platform all          # build de loja
```

**Submissão à loja** (fora do escopo desta revisão — "não executar
publicação"):

```bash
eas submit --profile production --platform ios       # exige App Store Connect configurado
eas submit --profile production --platform android    # exige Google Play Console configurado
```

## Versionamento

`eas.json`'s `cli.appVersionSource: "local"` já configurado — a versão/
build number vêm de `app.json` (`version`) e são incrementados localmente
pelo EAS a cada build, não geridos pelo lado do servidor da loja.
`production.autoIncrement: true` incrementa o build number automaticamente
a cada build de produção, evitando o erro comum de reenviar o mesmo build
number para a loja.

## Checklist antes do primeiro build de produção

```text
[ ] eas init rodado — expo.extra.eas.projectId presente em app.json
    (necessário para push — ver docs/notifications.md)
[ ] EXPO_PUBLIC_API_URL de "production" apontando para a API real, testado
[ ] Ícones/splash finais (não os placeholders de desenvolvimento, se aplicável)
[ ] app.json: version conferida, bundleIdentifier/package conferidos
[ ] Conta Apple Developer (paga) e Google Play Console configuradas, se for
    submeter às lojas
[ ] pnpm lint / pnpm typecheck / pnpm test / npx expo-doctor todos limpos
    (ver docs/security-review.md, "TESTES")
```

## Documentação relacionada

- [docs/development.md](development.md) — ambiente de desenvolvimento local (fora de EAS)
- [docs/security-review.md](security-review.md) — revisão de segurança completa
- [docs/api-client.md](api-client.md) — como `EXPO_PUBLIC_API_URL` é consumido
- [docs/notifications.md](notifications.md) — por que `expo.extra.eas.projectId` é necessário
