# Ingressou

Plataforma regional de venda de ingressos com split de pagamento automático (Mercado Pago),
validação por QR Code e três frentes de acesso: Site de Vendas, Portal do Produtor e Portal
Gestor ADM — todos no mesmo app Next.js, diferenciados por papel de usuário (`profiles.role`)
e RLS no Supabase.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + RLS) — `@supabase/ssr`
- Mercado Pago (`mercadopago` SDK) — Checkout Transparente com split via `application_fee`
- QR Code: `qrcode` (geração) + `html5-qrcode` (leitura pela câmera no check-in)
- Google Wallet: JWT assinado com `jsonwebtoken` (Generic Pass)

## Estrutura de rotas

- `/` — vitrine pública de eventos (Site de Vendas)
- `/[slug]` e `/[slug]/[eventSlug]` — página do produtor e do evento (slug reservado: ver
  `RESERVED_SLUGS` em `src/types/database.ts`)
- `/checkout/[eventId]` — checkout PIX / cartão
- `/pedido/[orderId]` e `/ingresso/[codigoQr]` — acompanhamento do pedido e ingresso com QR Code
- `/validar/[eventSlug]?token=...` — link de validação para colaboradores, sem login
- `/produtor/**` — Portal do Produtor (login, `role = produtor`)
- `/admin/**` — Portal Gestor ADM (login, `role = admin`)

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com) e rode as migrations em ordem:

   ```bash
   supabase db push
   # ou aplique manualmente os arquivos em supabase/migrations/*.sql, em ordem, no SQL editor
   ```

   As migrations criam todo o schema (perfis, produtores, eventos, lotes, pedidos, ingressos,
   splits, colaboradores/validators, tabela de taxas do MP) com RLS habilitada em todas as
   tabelas, além das funções `resolve_login_identifier`, `validate_ticket` (check-in atômico) e
   `reserve_ticket_stock`/`release_ticket_stock` (controle de estoque de lote).

2. No painel do Supabase, em Authentication → Providers, **desative a confirmação de e-mail
   obrigatória** (ou configure o SMTP) para permitir login logo após o cadastro no MVP.

3. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
     — em Project Settings → API do Supabase.
   - `TICKET_HMAC_SECRET` — string aleatória longa (ex: `openssl rand -hex 32`), usada para
     assinar os QR Codes dos ingressos.
   - `MERCADOPAGO_CLIENT_ID` / `MERCADOPAGO_CLIENT_SECRET` / `MERCADOPAGO_REDIRECT_URI` — da
     aplicação **Marketplace** criada em [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
     (necessário para o OAuth de conexão da conta dos produtores e para o split via
     `application_fee`).
   - `MERCADOPAGO_PLATFORM_ACCESS_TOKEN` — access token da conta da plataforma (dona da
     aplicação), usado para consultar pagamentos no webhook.
   - `NEXT_PUBLIC_SITE_URL` — URL pública do deploy (usada para montar `notification_url` do MP
     e o link de OAuth).
   - Variáveis `GOOGLE_WALLET_*` são opcionais — sem elas o botão "Salvar no Google Wallet"
     simplesmente não aparece. Para habilitar: crie uma conta de serviço no
     [Google Wallet Console](https://pay.google.com/business/console), crie uma classe de
     Generic Pass com id `${GOOGLE_WALLET_ISSUER_ID}.ingressou_ticket_class` e preencha as
     credenciais.

4. Crie o primeiro usuário `admin` manualmente: cadastre-se normalmente pelo `/cadastro` e depois
   atualize `profiles.role` para `admin` direto no banco (não há fluxo de auto-promoção a admin,
   por segurança).

5. `npm install && npm run dev`.

## Webhook do Mercado Pago

Configure a notification URL da aplicação para `https://SEU_DOMINIO/api/webhooks/mercadopago`.
O endpoint confirma o pagamento, gera os ingressos (com QR assinado por HMAC) e libera o pedido
de forma idempotente — também é chamado de forma síncrona no checkout quando um cartão é
aprovado imediatamente.

## Regra de taxas

- Plataforma: sempre 3% fixo sobre o valor do ingresso (`platform_config`, editável pelo Gestor
  ADM em `/admin/taxas`).
- À vista (PIX ou crédito 1x): a taxa do Mercado Pago é descontada do produtor, junto dos 3% da
  plataforma.
- Parcelado (2x+): o acréscimo do parcelamento é somado ao valor cobrado do cliente, sem afetar
  o repasse do produtor nem o lucro da plataforma (ver `calculateSplit` em `src/lib/mercadopago.ts`).
- A tabela `mp_fee_table` (percentuais de referência do MP por método/parcela) é editável pelo
  Gestor ADM e deve ser ajustada conforme o contrato real da conta MP da plataforma.

## Limitações conhecidas do MVP

- **Apple Wallet** não foi implementado (depende de certificado de desenvolvedor Apple —
  fora do MVP, conforme especificação).
- O cartão de crédito usa o **CardForm** clássico do SDK MP.js v2 (Secure Fields via iframe);
  produção pode considerar migrar para MP Bricks conforme a documentação mais recente do MP.
- Não há envio de e-mail transacional (confirmação de compra/ingresso) — o comprador acessa o
  ingresso pelo link `/pedido/[orderId]` retornado após o pagamento. Integrar um provedor de
  e-mail (Resend, SES, etc.) fica como próximo passo.
- Exportação de ingressos é apenas em CSV (PDF fica como próximo passo).
- App mobile do produtor e app nativo de portaria (leitura offline) ficam fora do MVP, conforme
  especificação.
