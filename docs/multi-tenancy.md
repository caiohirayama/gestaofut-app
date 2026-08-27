# Organizations, Groups e Permissions no app

Consome exclusivamente o contrato já exposto pelo `gestaofut-api` (ver o
`docs/multi-tenancy.md` desse repositório) — nenhum campo ou endpoint foi
inventado no cliente.

## Fluxo depois do login

```text
/(auth)/login → autentica
      ↓
/(group-setup) → GroupGateScreen resolve o grupo ativo:
      ↓
  GET /me                                (usuário atual)
  GET /organizations                     (organizações do usuário)
  GET /organizations/:id/groups (por org) (grupos, agregados)
  GET /organizations/:id/members (por org, para achar a própria role)
      ↓
  0 grupos, sem permission group.update em nenhuma org → EmptyGroupsScreen
  0 grupos, mas pode criar (dono de alguma org, ou nenhuma org ainda)
      → /(group-setup)/create (CreateGroupScreen)
  1 grupo → seleciona automaticamente (sem perguntar) → /(app)
  >1 grupos, sem grupo persistido válido → lista para escolher → /(app)
      ↓
/(app) → <Tabs> dinâmicas conforme as permissions do grupo ativo
```

## GroupContext (equivalente)

Implementado como `src/store/group-store.ts` (Zustand), não React Context —
para ficar consistente com `useAuthStore` (ver
[state-management.md](state-management.md)). Guarda só
`{ activeGroupId, activeOrganizationId }`. **Nunca é autorização**: é um
ponteiro de conveniência, persistido via SecureStore para não pedir seleção
toda vez que o app abre, sempre revalidado contra `GET /organizations/:id/groups`
antes de ser confiado (um id persistido que não aparece mais nessa lista é
descartado silenciosamente).

## "Minha role" e permissions

O contrato não tem um campo "minha role" pronto: `GET /organizations` não
inclui role nenhuma, só `GET /organizations/:id/members` (o roster
completo) tem esse dado. `useMyOrganizationRoles`
(`src/features/groups/hooks/`) busca essa lista por organização e casa pelo
próprio `userId` (de `GET /me`) — todo papel ativo inclui `member.read`,
então isso sempre funciona para quem é de fato membro.

A partir da role real, `src/features/groups/utils/permissions.ts` — um
**espelho** do mapa role → permission do `gestaofut-api`
(`shared/authorization/role-permissions.ts` de lá, mesmos 5 papéis, mesmas
10 permissions) — calcula o que a UI deve mostrar. Isso é
**deliberadamente só um hint de UI**: toda mutação (criar grupo, adicionar
membro, mudar configuração) ainda é validada de verdade pela API, que
responde `403` se a permission real não bater. Esconder um botão não
substitui a autorização do backend — só evita levar o usuário a uma ação
que já se sabe que vai falhar.

## Tabs dinâmicas (`app/(app)/_layout.tsx`)

Cada `<Tabs.Screen>` usa `options={{ href: tabVisibility(can(permission)) }}`
— `href: null` esconde a tab da barra mantendo a rota acessível (padrão do
Expo Router para tabs condicionais):

| Tab | Permission |
| --- | --- |
| Início | sempre |
| Jogos | `match.read` |
| Jogadores | `member.manage` |
| Financeiro | `finance.read` |
| Mais | sempre |

Isso é composição, não uma tabela fixa por role — um `TREASURER` (tem
`finance.read` mas não `member.manage`) vê Início/Jogos/Financeiro/Mais,
uma combinação que não está entre os três exemplos do pedido original mas
sai correta da mesma regra.

## Telas (`src/features/groups/screens/`)

- `GroupGateScreen` — a orquestração acima (`(group-setup)/index.tsx`).
- `CreateGroupScreen` (`(group-setup)/create.tsx`, também alcançável a
  partir da seleção/troca de grupo) — cria o grupo numa organização que o
  usuário já administra (`group.update`); se não houver nenhuma, cria antes
  uma organização nova nomeada a partir do grupo — a pessoa nunca precisa
  pensar em "organização" como conceito separado.
- `GroupSettingsScreen` (`app/group-settings.tsx`, aberta a partir de
  "Mais") — campos do `Group` (nome/descrição/modalidade/timezone) e do
  `GroupSettings` ("básicas": limites de jogadores, mensalidade, valor de
  convidado, prazo de confirmação, moeda, timezone). Todo mundo com
  `group.read` (qualquer membro ativo) vê a tela; só quem tem `group.update`
  vê os campos editáveis e o botão salvar — sem esse permission, os mesmos
  campos aparecem como somente leitura.
- `MembersScreen` (tab Jogadores) — lista `GET /groups/:id/members`; exige
  `member.manage` para ver o formulário de adicionar/remover (a tab em si já
  não aparece sem essa permission).
- `SwitchGroupScreen` (`app/switch-group.tsx`, "Trocar grupo" em "Mais",
  só exibido quando há mais de um grupo) — sempre lista todos os grupos,
  ao contrário do `GroupGateScreen` (que evita perguntar quando há só um).

## Limitações conhecidas do contrato atual

- **Não existe busca de usuário por e-mail.** `POST /groups/:id/members`
  exige um `userId` (UUID). `MembersScreen` expõe um campo de texto para
  colar esse ID diretamente — funcional, mas claramente uma solução
  provisória até existir um endpoint de busca/convite por e-mail no
  `gestaofut-api`.
- **`GroupMember`/`OrganizationMember` não trazem nome/e-mail do usuário** —
  só `userId`. `MembersScreen` mostra o ID cru por falta de um endpoint de
  perfil público/em lote; nomes reais exigiriam um novo endpoint na API.
