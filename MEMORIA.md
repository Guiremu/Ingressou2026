# Memória do projeto — ingressou

> Documento de referência completo: o que existe, como funciona, e por quê. Escrito pra
> qualquer pessoa (ou IA) retomar o projeto do zero sem precisar reconstruir contexto.
> Sempre que uma decisão de negócio importante for tomada ou uma função nova for criada,
> atualize este arquivo.

## 1. O que é

Plataforma regional de venda de ingressos para eventos (base geográfica: Ariquemes-RO e
cidades próximas). Três frentes de acesso, todas no mesmo app Next.js, diferenciadas por
`profiles.role`:

1. **Site de Vendas** (público) — vitrine, página de produtor, ficha de evento, checkout,
   conta do comprador ("Meus ingressos", perfil).
2. **Portal do Produtor** (`role = produtor` ou `colaborador`) — CRUD de eventos/lotes,
   cortesias, colaboradores de portaria, check-in, financeiro, conexão com Mercado Pago.
3. **Portal Gestor ADM** (`role = admin`) — aprovação de produtores, config de taxas, visão
   geral da plataforma.

Deploy em produção: **Vercel** (`ingressou2026.vercel.app`, projeto `ingressou2026`,
auto-deploy a cada push em `main`). Banco: **Supabase** (projeto `yapfeesumgxeezzlivfa`).

## 2. Stack técnica

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript, Tailwind v4.
- **Supabase**: Postgres + Auth + RLS em todas as tabelas + Storage (bucket `event-images`).
- **Mercado Pago** (`mercadopago` SDK) — Checkout Transparente com split via `application_fee`
  + OAuth Marketplace (produtor conecta a própria conta).
- **`qrcode`** — geração do QR do ingresso. **`pdf-lib`** — geração do PDF do ingresso.
  **`next/og` (`ImageResponse`)** — geração da imagem PNG do ingresso (recurso nativo do
  Next, sem dependência extra).
- **`html5-qrcode`** — leitura de QR pela câmera no check-in.
- **`jsonwebtoken`** — JWT assinado pro Google Wallet (Generic Pass).
- **`zod`**, **`date-fns`**, **`class-variance-authority`**, **`tailwind-merge`**.
- Design: dark theme, fontes Sora (títulos) + Archivo (corpo), acento lima (`--accent`).
  Paleta "site" usa tokens CSS (`var(--surface)`, `var(--border)` etc.); o **Portal do
  Produtor** usa uma paleta própria mais azulada hardcoded (`#0f141d`/`#121722`/`#263041`/
  `#18202e`/`#93a0b8`) — ver seção 12 sobre isso.

## 3. Variáveis de ambiente (`.env.local` / Vercel)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
TICKET_HMAC_SECRET                      # assina o QR Code de cada ingresso
MERCADOPAGO_PLATFORM_ACCESS_TOKEN       # conta da plataforma (dona do app OAuth), usada pro webhook consultar pagamentos
MERCADOPAGO_CLIENT_ID / MERCADOPAGO_CLIENT_SECRET   # credenciais do app MP (mesmas p/ teste e produção; o que muda é a conta que loga no OAuth)
MERCADOPAGO_REDIRECT_URI                # precisa bater exatamente com o cadastrado no app MP (Configuração avançada > URL de redirecionamento)
MERCADOPAGO_WEBHOOK_SECRET              # assinatura secreta do webhook (Webhooks > Configurar notificação no painel MP)
NEXT_PUBLIC_SITE_URL                    # usada pra montar notification_url do MP e o link de OAuth
GOOGLE_WALLET_ISSUER_ID / GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL / GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY  # opcional, deixar em branco desabilita o botão
```

Hoje em produção o Mercado Pago está configurado com **credenciais de produção reais**
(pagamentos de verdade, não sandbox) — client ID `3097641250182834`. Webhook configurado em
`https://ingressou2026.vercel.app/api/webhooks/mercadopago` (evento "Pagamentos (legacy)",
não "Order (Mercado Pago)" — o código usa a API de Pagamentos clássica, não a API de Orders
nova do MP).

## 4. Modelo de dados (schema atual, Postgres/Supabase)

Todas as tabelas têm RLS habilitada. Migrações em `supabase/migrations/0001` a `0013`
(aplicadas via MCP do Supabase, não pela CLI local).

### `profiles` (estende `auth.users`)
`id (=auth.users.id)`, `role (admin|produtor|colaborador|cliente)`, `nome`, `cpf (unique)`,
`telefone`, `email (unique)`, `criado_em`.
Login pode ser feito por CPF, e-mail ou telefone — resolvidos pra e-mail real via RPC
`resolve_login_identifier` antes de chamar `supabase.auth.signInWithPassword`. Comparação de
e-mail é case-insensitive (bug corrigido — ver seção 11).
RLS: usuário lê/atualiza o próprio perfil; admin lê todos via `current_role_v()` (função
`security definer` que evita recursão de RLS — **nunca** faça uma policy de `profiles`
consultar `profiles` diretamente de novo, foi bug real, ver seção 11).

### `producers`
`id`, `profile_id`, `tipo_pessoa (fisica|juridica)`, `cpf`, `cnpj`, `razao_social`,
`nome_fantasia`, `logo_url`, `banner_url`, `descricao`, `cidade`, `slug (unique, regex
kebab-case)`, `status (pendente|aprovado|bloqueado)`, `mp_user_id`, `mp_access_token`,
`mp_refresh_token`, `mp_public_key` (preenchidos via OAuth do Mercado Pago).
Só produtor com `status = aprovado` pode publicar eventos e conectar Mercado Pago.

### `events`
`id`, `producer_id`, `titulo`, `descricao`, `categoria` (lista fixa, ver
`CATEGORIAS_EVENTO` em `src/lib/event-defaults.ts`), `imagem_url` (upload via Storage),
`local`, `endereco`, `cidade` (lista fixa, `CIDADES_ATENDIDAS`), `data_inicio`, `data_fim`,
`status (rascunho|publicado|encerrado|cancelado)`, `slug` (único por produtor, não editável
depois de criado), `politica_reembolso` (texto, pré-preenchido com um padrão da plataforma —
`POLITICA_REEMBOLSO_PADRAO` — editável pelo produtor), `criado_em`.
RLS: público só vê `status = publicado`; produtor vê/gerencia (`for all`) os próprios;
admin, tudo.

### `ticket_types` (lotes)
`id`, `event_id`, `nome`, `descricao`, `preco (numeric, >= 0)`, `quantidade_total`,
`quantidade_vendida (default 0, <= quantidade_total via CHECK quantidade_disponivel)`,
`data_inicio_venda`, `data_fim_venda`, `max_por_pedido (default 10)`,
`tipo (pago|cortesia)`, `ativo (default true — pausar/reativar sem apagar)`,
`ordem (int, controla a posição de exibição — setas ↑/↓ na UI trocam o valor com o vizinho)`,
`criado_em`.
Cada evento tem no máximo **um** lote `tipo = cortesia` (criado sob demanda, quantidade
gigante `1000000`, usado como "guarda-chuva" pra todas as cortesias do evento).
Estoque é mexido só via RPC `reserve_ticket_stock` / `release_ticket_stock` (atômicas,
`security definer`) — nunca por UPDATE direto de `quantidade_vendida` em código de app.

### `orders` (pedidos)
`id`, `event_id`, `profile_id` (nullable — preenchido com o comprador logado; **compra
sempre exige login**, então isso é sempre preenchido em pedidos novos), `comprador_nome`,
`comprador_email`, `comprador_cpf`, `comprador_telefone` (esses 4 vêm direto do perfil
logado, sem formulário — ver seção 7), `valor_ingressos`, `valor_taxa_parcelamento` (nome
histórico — hoje guarda a taxa do MP somada ao total em QUALQUER método, não só
parcelamento, ver seção 8), `valor_total_cobrado`, `metodo_pagamento (pix|credito)`,
`parcelas`, `mp_payment_id`, `status (pendente|pago|cancelado|estornado)`, `criado_em`.

### `order_items` (carrinho multi-lote)
`id`, `order_id`, `ticket_type_id`, `quantidade (> 0)`, `preco_unitario`, `criado_em`. Um
pedido pode ter vários lotes diferentes (ex: 2 Pista + 1 VIP).

### `tickets` (ingresso individual, 1 linha por unidade)
`id`, `order_id` (nullable — cortesia não tem pedido), `ticket_type_id`, `event_id`,
`codigo_qr (uuid, unique)`, `assinatura_hmac`, `status (valido|usado|cancelado)`,
`usado_em`, `validado_por (profile do colaborador/produtor que validou)`, `is_cortesia`,
`motivo_cortesia (funcionario|amigo|patrocinador|outro)`, `titular_nome`, `titular_cpf`,
`intransferivel (default false)`, `profile_id` (nullable — conta dona do ingresso; ver
seção 9.3 sobre vínculo por CPF), `gerado_por`, `criado_em`.
`profile_id` é **a fonte da verdade de quem é dono do ingresso pra fins de "Meus
ingressos"** — independente de ter vindo de uma compra (via `order.profile_id`) ou de uma
cortesia vinculada direto. RLS de leitura do comprador: `profile_id = auth.uid() OR order_id
in (select id from orders where profile_id = auth.uid())`.

### `payment_splits`
`id`, `order_id`, `valor_bruto`, `taxa_mp`, `taxa_plataforma`, `valor_liquido_produtor`,
`criado_em`. Um por pedido pago — snapshot do split calculado no momento do pagamento.

### `validators` (colaboradores de portaria)
`id`, `event_id`, `producer_id`, `profile_id` (nullable — se o colaborador logar com
conta própria), `token_publico (unique)`, `nome_identificacao`, `ativo`, `expira_em`,
`criado_em`. O link `/validar/[eventSlug]?token=...` funciona **sem login**.

### `mp_fee_table`
Tabela de taxas de referência do MP por `metodo_pagamento` + `parcelas` (editável em
`/admin/taxas`). Usada só pra estimar `taxaMp` no momento do checkout — não é o que o MP
realmente cobra (isso é definido pela integração real com a conta do produtor).

### `platform_config`
Linha única (`id boolean, sempre true`), `taxa_plataforma_percentual (default 0.03)`.
Editável pelo Gestor ADM em `/admin/taxas`.

### Storage
Bucket `event-images` (público) — imagem de capa do evento, upload feito via Server
Action com o client de **service role** (bypassa RLS de storage; por isso não há policies
de INSERT/UPDATE/DELETE em `storage.objects`, só o bucket público que libera leitura).
Caminho: `<producer_id>/<event_id>-<timestamp>.<ext>`.

## 5. Autenticação e papéis

- `src/lib/auth.ts`: `getCurrentProfile()` (usa `supabase.auth.getUser()` + select em
  `profiles`), `requireRole(roles, redirectTo?)`, `requireLogin(redirectTo?)`.
- Login (`src/app/login/actions.ts`): identificador (CPF/e-mail/telefone) → RPC
  `resolve_login_identifier` → e-mail real → `signInWithPassword`. Depois de logar, lê o
  papel e redireciona: `admin` → `/admin`, `produtor|colaborador` → `/produtor`, senão `/`.
  Aceita um campo `redirect` (hidden input, populado via `?redirect=` na URL do `/login`)
  que tem prioridade sobre o redirecionamento por papel — usado pelo checkout pra voltar
  exatamente pra onde o usuário estava depois de logar. Só aceita redirect começando com
  `/` e não `//` (evita open redirect).
- Cadastro comprador: `/cadastro` (role `cliente`). Cadastro produtor: `/cadastro/produtor`
  (role `produtor`, cria linha em `producers` com `status = pendente`, aguarda aprovação do
  Gestor ADM).
- `src/lib/producer.ts`: `requireProducer()` (garante papel produtor + carrega a linha de
  `producers`) e `getEventoDoProdutor(eventId)` — versão com `cache()` do React que garante
  posse do evento (`notFound()` se não for do produtor logado), usada pelo layout de abas
  de evento e por cada aba, deduplicando a query dentro da mesma request.
- **Import importante sobre `redirect()`/`notFound()` do Next**: como o app agora tem
  `loading.tsx` em várias rotas (Suspense boundary automático), uma vez que o "shell" já
  começou a ser transmitido com status 200, um `redirect()`/`notFound()` mais profundo na
  árvore não pode mais mudar o status HTTP — ele vira uma instrução embutida no stream que
  só um **navegador de verdade** (executando JS) consegue seguir. Isso é esperado e correto
  pra usuários reais; só **não dá pra testar login/redirect via `curl` sem seguir
  JavaScript** — o curl vai ver sempre o fallback do `loading.tsx` mais próximo (ex: a
  vitrine), nunca um 307 de verdade. Não é bug, é limitação de ferramenta de teste.

## 6. Site de Vendas (comprador)

- `/` (vitrine) — grid de eventos publicados, filtro por cidade/categoria/busca
  (`EventFilters`, via query string). Preço mínimo calculado a partir dos lotes `tipo =
  pago`.
- `/[slug]` — página do produtor (banner, avatar, tabs Próximos/Encerrados/Sobre).
- `/[slug]/[eventSlug]` — ficha do evento: banner, descrição, local, **política de
  reembolso** (se preenchida), e `<TicketSelector>` (client) com stepper por lote — só
  mostra lotes `ativo = true`, ordenados por `ordem`.
- `/checkout/[eventId]` — **exige login** (`requireLogin`, redireciona pra `/login?redirect=
  ...` preservando o carrinho). Wizard de 3 passos: Ingressos → Dados (mostra os dados da
  conta logada, sem formulário — não existe mais "comprar como convidado") → Pagamento
  (PIX ou cartão de crédito 1-12x, `<Script src="https://sdk.mercadopago.com/js/v2">`
  pro CardForm tokenizar o cartão no client). Resumo lateral sempre mostra Subtotal + **Taxa
  da plataforma** + **Taxa de processamento (Mercado Pago)** + Total — nunca escondidas
  (ver seção 8 sobre a regra de taxa).
- `/pedido/[orderId]` — confirmação pós-checkout, lista os ingressos gerados.
- `/ingresso/[codigoQr]` — página pública do ingresso individual (**sem login**, qualquer
  um com o link acessa — é assim que dá pra repassar um ingresso pra outra pessoa usar).
  Mostra QR, dados, aviso de "não compartilhe o QR" e, se `intransferivel`, aviso extra
  pedindo documento com foto. Botões: **Exportar/compartilhar** (Web Share API ou copiar
  link — `ShareTicketButton`), **Baixar PDF** (`/ingresso/[codigoQr]/pdf`, gerado com
  `pdf-lib`), **Baixar imagem** (`/ingresso/[codigoQr]/imagem`, gerado com `next/og`
  `ImageResponse`, PNG 800x1050), Google Wallet (se configurado), Apple Wallet (stub
  "em breve", nunca implementado).
  A busca/derivação de dados do ingresso é compartilhada entre a página e as duas rotas de
  export via `src/lib/ticket-view.ts` (`getTicketViewData`).
- `/meus-ingressos` — exige login. Duas seções: pedidos (`orders` onde `profile_id =
  auth.uid()`) e **"Cortesias recebidas"** (tickets com `profile_id = auth.uid()` e
  `order_id is null` — cortesia vinculada direto por CPF, sem pedido).
- `/perfil` — editar nome/telefone, trocar senha.
- Páginas institucionais (sem dado dinâmico): `/termos`, `/privacidade`, `/regras`,
  `/sobre`, `/suporte` — usam `<LegalPage>`. Rodapé `<SiteFooter>` com esses links.
- `SiteHeaderAsync` — o header (que faz uma checagem de login) é envolto em `<Suspense
  fallback={<SiteHeaderSkeleton>}>` em toda página que o usa, pra não bloquear o resto do
  conteúdo enquanto resolve a sessão (ver seção 11, performance).

## 7. Regra de compra: sempre logado, dono do ingresso = quem comprou

Decisão de negócio confirmada com o usuário: **ingresso é sempre vinculado à conta de quem
comprou (`profile_id`), nunca ao e-mail**. Não existe mais compra como convidado — o
checkout inteiro (`/checkout/[eventId]`) chama `requireLogin` antes de qualquer coisa.
Se você quer que outra pessoa use o ingresso, você **compra pra você e depois exporta/
compartilha o link** (`/ingresso/[codigoQr]`) — a outra pessoa **não precisa ter conta**
pra usar esse link/QR na portaria. (Uma versão anterior tentou um fluxo de "comprar pra
outra pessoa" via CPF no checkout — foi revertida a pedido do usuário, migrations 0009/0010
criaram e depois removeram uma função `find_profile_by_cpf` só pra isso; a única forma atual
de mandar ingresso pra outra pessoa é exportar/compartilhar depois da compra, ou — só no
caso de cortesia gerada pelo produtor — vincular direto por CPF, ver seção 9.3).

Além disso, desde a migração `0015`, o titular pode transferir o próprio ingresso pra
outra conta já cadastrada (autoatendimento, sem passar pelo produtor) — formulário
"Transferir ingresso" em `/ingresso/[codigoQr]` (`transferir-ingresso-form.tsx` +
`transferirIngressoAutoatendimento` em `actions.ts`), só visível pro dono logado, só
funciona pra ingresso `valido` e não-`intransferivel`, exige o CPF de uma conta já
cadastrada. A policy de leitura de `tickets` foi ajustada na mesma migração: antes o
comprador original continuava enxergando o ingresso pra sempre via `order_id` mesmo depois
de transferido; agora esse vínculo só vale enquanto `profile_id` estiver nulo (ou seja,
assim que alguém transfere, o vínculo por `order_id` some pro ex-titular).

`/meus-ingressos` foi reescrita pra listar **ingressos individuais** direto (não mais
pedidos agrupados) — cada card já abre `/ingresso/[codigoQr]` num clique só, sem passar
por `/pedido/[orderId]`. Badge de status só aparece quando não é `valido` (usado/cancelado)
— **"pago" não aparece mais**, por decisão do usuário ("se tá ali é que tá pago"). Pedidos
sem ingresso ainda (pendente) ou que não vingaram (cancelado/estornado) ficam numa seção
separada "Outros pedidos", que ainda linka pra `/pedido/[orderId]`.

## 8. Regra de taxas (Mercado Pago + plataforma) — **sempre no comprador, sempre visível**

Decisão de negócio final (corrigida depois de uma versão anterior que descontava do
produtor no PIX/à vista): em **qualquer** forma de pagamento (PIX, crédito 1x, crédito
parcelado 2-12x), a taxa da plataforma (3%, `platform_config.taxa_plataforma_percentual`)
e a taxa do Mercado Pago (`mp_fee_table`, por método/parcela) são **sempre somadas ao total
cobrado do comprador**, nunca descontadas do produtor. O produtor **sempre** recebe o valor
cheio dos ingressos (`valorLiquidoProdutor === valorIngressos`); a plataforma sempre recebe
exatamente os 3% via `application_fee` na chamada ao MP; o comprador absorve o resto (a
taxa real do MP).

Implementação — `src/lib/split-calc.ts`, função pura `calculateSplit` (importada tanto no
servidor quanto no client component do checkout, pra mostrar o resumo em tempo real):

```
taxaPlataforma = valorIngressos * taxaPlataformaPercentual
valorTotalCobrado = (valorIngressos + taxaPlataforma) / (1 - taxaMpPercentual)   // gross-up
taxaMp = valorTotalCobrado - valorIngressos - taxaPlataforma
valorLiquidoProdutor = valorIngressos   // sempre, sem desconto
applicationFee = taxaPlataforma          // sempre, enviado pro MP
```

Exemplo real testado: ingresso de R$5,00 no PIX (taxa MP ~0,99%) vira **R$5,20** cobrado
(R$0,15 de taxa da plataforma + R$0,05 de taxa MP), produtor recebe R$5,00 cheio.

O resumo do checkout (`checkout-form.tsx`) sempre mostra as duas linhas de taxa separadas
(nunca escondidas atrás de "só aparece se parcelado"). O nome do campo
`orders.valor_taxa_parcelamento` / `SplitCalculo.valorTaxaParcelamento` é histórico — hoje
representa a taxa do MP em qualquer método, não só parcelamento (não foi renomeado pra
evitar uma migração de coluna só por semântica).

`createTransparentPayment` (`src/lib/mercadopago.ts`) usa a conta OAuth do produtor
(`producers.mp_access_token`) como `accessToken` do client MP, com `application_fee` = 3%
do valor do ingresso — o MP credita esse valor pra conta da plataforma automaticamente e
o resto (menos a taxa própria do MP) pro produtor.

### 8.1 Ingressos gratuitos não passam pelo Mercado Pago

Quando o subtotal do carrinho é R$0,00 (só lotes com `preco = 0`), o checkout pula a etapa
de escolha PIX/crédito inteiramente (`isGratuito` em `checkout-form.tsx`) e o servidor
(`criarPedido` em `src/app/checkout/[eventId]/actions.ts`) detecta `valorIngressos === 0`
(`gratuito`) e: não exige `producers.mp_access_token`/status aprovado, monta um
`payment_splits` zerado, grava `orders.metodo_pagamento = 'gratuito'` (novo valor no enum
`payment_method`, migração `0014`) e chama `finalizePaidOrder(order.id, null)` direto — sem
nenhuma chamada ao MP. `finalizePaidOrder` aceita `mpPaymentId: string | null` agora.

### 8.2 Cartões salvos (Mercado Pago Customers/Cards)

Tabela `saved_cards` (migração `0014`): `profile_id`, `producer_id`, `mp_customer_id`,
`mp_card_id`, `last_four_digits`, `payment_method_id`, `cardholder_name`. RLS: comprador só
enxerga/apaga os próprios (`profile_id = auth.uid()`); insert/update só via admin client
(server action). Um cartão é salvo **por produtor**, porque cada cobrança roda na conta MP
daquele produtor específico (split payment via OAuth) — o "cofre" de cartões do MP também é
por conta, não é global da plataforma.

Fluxo (`src/lib/mercadopago.ts`, usa os recursos `Customer`/`CustomerCard`/`CardToken` do SDK
`mercadopago` v3): ao marcar "salvar este cartão" e o pagamento ser feito com cartão novo,
`findOrCreateMpCustomer` busca/cria um customer no MP (por e-mail, na conta do produtor) e
`saveCardForCustomer` salva o cartão **usando o mesmo card_token** que acabou de ser gerado
pro pagamento (chamado antes do `Payment.create`, mesmo token reaproveitado — save-card não
"gasta" o token de pagamento). Numa compra seguinte pro mesmo produtor, o comprador escolhe o
cartão salvo na lista e digita só o CVV; o servidor gera um token novo a partir de
`card_id + customer_id + security_code` via `CardToken.create` (não precisa reabrir o iframe
do MP) e paga com `payer: { type: "customer", id: customerId }`. Falha ao salvar o cartão
nunca bloqueia a compra (try/catch silencioso, segue com pagamento normal).

Trade-off registrado: o CVV do cartão salvo viaja como campo normal do form (server action),
não via tokenização client-side — mais simples de implementar com o SDK server-side
disponível, mas para compliance PCI mais rígido o ideal seria gerar esse token também no
client. Reavaliar se o volume de transações justificar o esforço extra.

### 8.3 Bug corrigido: campos de cartão vazando da tela

O formulário de cartão novo (`cardForm` do SDK MP, modo `iframe: true`) usava `<input>` como
container dos campos sensíveis (`cardNumber`, `expirationDate`, `securityCode`). A doc oficial
do SDK (`sdk-js/docs/card-form.md`) exige que esses três sejam `<div>` — o MP injeta um
`<iframe>` dentro do elemento, e um `<input>` não aceita filho, então o SDK acabava
inserindo o iframe fora do fluxo normal do layout (com largura própria), estourando a tela
pra direita. Trocado pra `<div>` com `overflow-hidden`/`min-w-0`/`w-full` — os outros campos
(`cardholderName`, `issuer`, `identificationType/Number`, `cardholderEmail`) continuam
`<input>`/`<select>` normais (não são tokenizados via iframe). Parcelamento também passou de
`[1,3,6,12]` pra `1..12` completo (grid 4-6 colunas em vez de flex-wrap).

## 9. Portal do Produtor (`/produtor/**`)

Shell: `src/app/produtor/layout.tsx` — sidebar (desktop) / bottom-tabs (mobile) com nav
"Visão geral, Meus eventos, Financeiro, Configurações". Bloco de aviso se
`producer.status !== aprovado`. Paleta própria (`#0f141d`/`#121722`/`#263041`/`#18202e`).

### 9.1 Dashboard (`/produtor`)
Stats dos últimos 30 dias (vendas, ingressos vendidos, saldo a receber, conversão), atalhos,
tabela "Meus eventos", gráfico de vendas por dia (14 dias).

### 9.2 Gestão de evento (`/produtor/eventos/[id]/**`) — reestruturada em abas

Antes era uma página monolítica só (feia, sem hierarquia). Hoje é um **layout com abas**
(`src/app/produtor/eventos/[id]/layout.tsx` + `evento-tabs.tsx`), no padrão de outras
plataformas do setor (Sympla separa Ingressos / Gestão de cortesias / Colaboradores em
áreas próprias — pesquisado antes de decidir a estrutura):

- **Visão geral** (`page.tsx`) — stat strip (vendidos, receita, cortesias emitidas),
  `<EventEditForm>` (edição completa do evento **já aberta**, sem precisar clicar em nada:
  título, descrição, categoria — select fixo —, local, endereço, cidade — select fixo —,
  datas, **upload de imagem de capa**, **política de reembolso** pré-preenchida), e "zona
  de risco" com botão excluir evento (só aparece se `status = rascunho`).
- **Lotes** (`lotes/page.tsx`) — `<LoteRow>` por lote existente (editar inline, pausar/
  reativar, duplicar, reordenar ↑/↓, excluir — só se `quantidade_vendida === 0`) +
  `<LoteForm>` pra criar novo.
- **Cortesias** (`cortesias/page.tsx`) — `<CortesiaForm>` + lista das já geradas.
- **Colaboradores** (`colaboradores/page.tsx`) — link de portaria por colaborador
  (`<ValidatorForm>` + `<ValidatorToggle>`).
- **Ingressos** (`ingressos/page.tsx`) — lista de todos os tickets do evento (não só
  cortesias), com badge "conta vinculada" quando `profile_id` já preenchido, e
  `<TransferirForm>` inline quando ainda não tem — export CSV em `ingressos/export`.
- **Check-in** (`checkin/page.tsx`) — `<CheckinScanner>` (câmera, via `html5-qrcode`),
  contador ao vivo, histórico.

Todas as ações ficam em `src/app/produtor/eventos/[id]/actions.ts`:
`atualizarStatusEvento`, `excluirEvento` (só rascunho — apaga `tickets` do evento
explicitamente antes, porque `tickets.event_id` **não tem** `on delete cascade`;
`ticket_types`/`validators` cascadeiam sozinhos via FK em `events`), `atualizarEvento`
(inclui upload de imagem pro bucket `event-images`), `criarLote`, `atualizarLote` (guarda:
não deixa reduzir `quantidade_total` abaixo de `quantidade_vendida`, erro amigável em vez de
erro cru do banco), `alternarLote` (pausar/reativar), `excluirLote`, `duplicarLote`,
`reordenarLote` (troca `ordem` com o vizinho), `gerarCortesia`, `transferirIngresso`,
`criarValidator`, `alternarValidator`.

### 9.3 Cortesias — regras de negócio confirmadas

- Geradas **uma de cada vez** (não em lote/quantidade — cada cortesia tem seu próprio
  titular; pra gerar N pra pessoas diferentes, gera N vezes).
- Checkbox **"Intransferível" vem marcado por padrão**. Quando marcado, **nome E CPF do
  titular são obrigatórios** (antes só o nome era).
- **Vínculo automático por CPF**: ao gerar, se o CPF do titular bater com uma conta já
  cadastrada em `profiles`, o ingresso **já nasce vinculado a ela** (`tickets.profile_id`
  preenchido na hora) e aparece direto em "Cortesias recebidas" de `/meus-ingressos` da
  pessoa. Se o CPF não tiver conta, o ingresso fica só na listagem do evento — sem dono.
- **Transferir depois**: em qualquer momento, o produtor pode voltar (aba Cortesias ou
  Ingressos) e usar `<TransferirForm>` (ação `transferirIngresso`) pra vincular por CPF um
  ingresso que ainda não tem `profile_id` — não precisa ser só cortesia, funciona pra
  qualquer ticket, embora na prática só cortesias ficam sem `profile_id` (compras normais
  já vêm com `profile_id` herdado do pedido, já que login é obrigatório pra comprar).
- Se `intransferivel = true`, o check-in (tanto logado quanto por link de colaborador,
  ambos usam `<CheckinScanner>`) mostra um aviso amarelo na hora do scan: "exija documento
  com foto" + nome/CPF do titular (a RPC `validate_ticket` retorna `titular_nome`,
  `titular_cpf`, `intransferivel` desde a migração 0012).

### 9.4 Financeiro (`/produtor/financeiro`)
Filtros (evento, status, período — via query string, compartilhados entre a página e o
export), stat strip (bruto, taxas, líquido), gráfico de receita líquida por dia (14 dias do
recorte filtrado), "Repasses por evento", lista de pedidos com taxa da plataforma / taxa MP
/ líquido detalhados por linha, botão **Exportar CSV** (`financeiro/export/route.ts`,
mesmos filtros). Query de `orders` filtrada centralizada em `financeiro/filtros.ts`
(`buildOrdersQuery`) pra não duplicar lógica entre página e export.

### 9.5 Conta (`/produtor/conta`)
Dados cadastrais + conexão com Mercado Pago. O produtor **nunca vê Client ID/Secret** —
só clica em "Conectar minha conta do Mercado Pago" (`getMpOAuthUrl`), loga com a conta MP
que já usa, e volta autenticado (`atualizarização` via `/api/mercadopago/oauth/callback`,
que faz `exchangeMpOAuthCode` e salva `mp_user_id`/`mp_access_token`/`mp_refresh_token`/
`mp_public_key`). Banner de sucesso/erro pós-OAuth (`?conectado=1` / `?erro=...`). Botão
"Desconectar" (`desconectarMercadoPago`) pra reconectar com outra conta se errou.

## 10. Portal Gestor ADM (`/admin/**`)

`role = admin`. Sidebar rosa (`#FF4D8D`). `/admin` (stats gerais, produtores pendentes),
`/admin/produtores` (aprovar/recusar/bloquear/reativar — `atualizarStatusProdutor`),
`/admin/taxas` (editar `platform_config.taxa_plataforma_percentual` e linhas de
`mp_fee_table`). Como virar admin: hoje é manual, via SQL direto
(`update profiles set role = 'admin' where email = '...'`) — não existe fluxo de UI pra
promover alguém a admin.

## 11. Bugs reais encontrados e corrigidos nesta sessão (não repetir)

1. **Login não funcionava com e-mail em maiúsculas.** Teclado de celular capitaliza a
   primeira letra de campos de texto genéricos; `resolve_login_identifier` comparava e-mail
   de forma case-sensitive. Corrigido em 3 camadas: `autoCapitalize="none"` no input,
   normalização (`toLowerCase()`) no server action, e a função SQL usa `lower(email) =
   lower(identifier)` (migração 0007).
2. **Recursão infinita de RLS em `profiles` (erro Postgres 42P17).** A policy "admin lê
   todos os perfis" fazia uma subquery em `profiles` de dentro de uma policy de `profiles`
   — causava recursão ao ler qualquer perfil, inclusive o próprio, logo após login (por
   isso o app "não fazia nada" depois de logar — nem erro aparecia, só ficava como
   deslogado). Corrigido usando a função `current_role_v()` (`security definer`, já
   existia mas não era usada aqui) em vez de reconsultar `profiles` (migração 0008). Mesma
   correção aplicada à policy de update.
3. **Supabase concede `EXECUTE` a `anon`/`authenticated` por privilégio padrão do schema**
   ao criar uma função nova — `revoke ... from public` **não** alcança grants feitos
   diretamente a essas roles. Pra restringir uma função nova só a `authenticated`, é preciso
   `revoke execute ... from anon` explicitamente (aconteceu com `find_profile_by_cpf`,
   migração 0009, depois removida).
4. **`ImageResponse` do `next/og`**: o tipo de `options.headers` aceito é o `HeadersInit`
   padrão (objeto simples), não o array `OutgoingHttpHeader[]` do tipo interno do Node —
   passar um objeto `{"Content-Disposition": "..."}` funciona normal.
5. **`Uint8Array` do `pdf-lib` (`pdfDoc.save()`) não é atribuível direto a `BodyInit`** em
   versões recentes de TS/lib DOM — envolver em `Buffer.from(bytes)` resolve.
6. **`ImageResponse`/rotas com JSX precisam de extensão `.tsx`**, não `.ts` (erro de parse).

## 12. Performance / streaming (trabalho de "deixar o site mais liso")

- **`SiteHeaderAsync`** (`src/components/site/site-header-async.tsx`) — envolve
  `<SiteHeader>` num `<Suspense fallback={<SiteHeaderSkeleton>}>`, porque `SiteHeader` fazia
  uma checagem de login (2 round-trips ao Supabase) **sem** Suspense, bloqueando o render
  inteiro de toda página onde aparecia. Usado no lugar de `<SiteHeader>` direto em 9 páginas.
- **`loading.tsx`** adicionado nas rotas de maior tráfego: `/`, `/[slug]`, `/[slug]/
  [eventSlug]`, `/checkout/[eventId]`, `/meus-ingressos`, `/produtor`, `/produtores` — mostra
  skeleton (`animate-pulse`) instantâneo ao navegar, antes dos dados chegarem. **Efeito
  colateral importante**: qualquer `redirect()`/`notFound()` mais fundo na árvore, uma vez
  que o loading.tsx já começou a transmitir o shell (200 OK), só consegue ser expresso como
  instrução embutida pro router client-side seguir — não muda mais o status HTTP real. Só
  afeta ferramentas que não executam JS (curl); navegador real funciona normal (ver seção 5).
- **`Promise.all`** em vez de awaits sequenciais nas páginas mais pesadas (vitrine, página
  do produtor, checkout, dashboard do produtor) — consultas independentes rodam em paralelo.
- Trocados alguns `<a href>` internos por `<Link>` do Next (abas do produtor, links
  pós-pagamento do checkout) — evitam reload de página inteira numa navegação que podia ser
  client-side.

## 13. Listas fixas / constantes de negócio

`src/lib/event-defaults.ts`:
- `CIDADES_ATENDIDAS` — Ariquemes, Porto Velho, Ji-Paraná, Cacoal, Vilhena, Jaru, Rolim de
  Moura, Guajará-Mirim (todas "Cidade, RO"). Antes era campo livre — fixado pra não
  fragmentar o filtro da vitrine com variações de digitação ("Ariquemes" vs "Ariquemes-RO").
- `CATEGORIAS_EVENTO` — Show, Festa, Festival, Teatro, Gastronomia, Esporte, Palestra, Outro.
- `POLITICA_REEMBOLSO_PADRAO` — texto padrão pré-preenchido em todo evento novo (baseado no
  que já estava descrito em `/regras`), editável pelo produtor depois.

Ambas validadas também no servidor (`atualizarEvento`, `criarEvento`), não só no `<select>`
do form, pra não aceitar POST direto com valor fora da lista.

## 14. O que NÃO existe (fora de escopo até agora)

- Cupons de desconto / código promocional (explicitamente adiado a pedido do usuário).
- Apple Wallet (botão fica como "em breve", nunca implementado).
- Fluxo de UI pra promover alguém a admin (só via SQL direto).
- Reordenar lotes por drag-and-drop (implementado como setas ↑/↓ trocando `ordem` com o
  vizinho — decisão consciente de manter simples).
- Meia-entrada como campo estruturado no schema (ficou de fora quando perguntado — o produtor
  pode usar a `descricao` do lote pra isso hoje).
- Guardas de negócio genéricas tipo "confirmar antes de cancelar evento publicado" (só
  existe a guarda específica de não reduzir `quantidade_total` abaixo do vendido).
- Notificação por e-mail pro comprador (confirmação de compra, mudança de data/local etc.)
  — não implementado.
- Testes automatizados (nenhum framework de teste configurado) — verificação é sempre
  manual: `npm run lint` + `npm run build` + smoke test via `curl`/leitura de código antes
  de cada commit.

## 15. Convenções de projeto (importante pra manter consistência)

- Migrações do Supabase são aplicadas via MCP (`mcp__Supabase__apply_migration`) direto no
  projeto `yapfeesumgxeezzlivfa`, **e também** salvas como arquivo em
  `supabase/migrations/00XX_nome.sql` no repo (documentação/histórico) — as duas coisas
  sempre juntas, nunca só uma.
- Depois de toda mudança de schema: rodar `mcp__Supabase__get_advisors` (tipo `security`) e
  conferir que não apareceu aviso novo além dos 4 pré-existentes (3 funções
  `security definer` chamáveis por `anon`/`authenticated` que são intencionais —
  `current_role_v`, `resolve_login_identifier`, `validate_ticket`, `rls_auto_enable` — e
  "Leaked Password Protection Disabled", que é config de Auth não mexida ainda).
- Antes de todo commit: `npm run lint` (deve sair limpo, zero output) e `npm run build`
  (27+ rotas, deve compilar e type-checar sem erro).
- Commits sempre com corpo detalhado explicando o *porquê*, terminando com o rodapé de
  atribuição (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` + link da sessão).
  Nunca commitar sem pedido explícito do usuário (mas nesta sessão o usuário já vem
  aprovando implicitamente ao pedir as features — push direto pra `main`, que é o branch
  de produção/deploy automático da Vercel).
- Server Actions sempre em `actions.ts` ao lado do componente que usa, retornando um
  `FormState { error?, success? }` (às vezes com campos extra, ex: `codigoQr`) —
  usados com `useActionState`. Ações "de botão" simples (toggle, delete) usam
  `useTransition` + chamada direta em vez de `useActionState`.
- Todo acesso a dado de outro usuário (ownership check) passa por `createAdminClient()`
  (service role, bypassa RLS) **com checagem manual explícita** de posse no código
  (`assertOwnsEvent`, `assertOwnsLote`, `getEventoDoProdutor`) — RLS é a rede de segurança
  de última instância, não o único controle.
