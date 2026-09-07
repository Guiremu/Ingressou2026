-- Ingressos gratuitos não passam pelo Mercado Pago: novo valor no enum de método de
-- pagamento pra identificar pedidos de valor zero, aprovados direto sem gateway.
alter type public.payment_method add value if not exists 'gratuito';

-- Cartões salvos no Mercado Pago (por comprador + produtor, já que cada cobrança roda
-- na conta MP do produtor via split payment — o cartão fica salvo no "customer" daquela
-- conta específica). Nunca guardamos número de cartão, só os identificadores do MP.
create table public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  producer_id uuid not null references public.producers(id) on delete cascade,
  mp_customer_id text not null,
  mp_card_id text not null,
  last_four_digits text not null,
  payment_method_id text not null,
  cardholder_name text,
  criado_em timestamptz not null default now(),
  unique (profile_id, producer_id, mp_card_id)
);

alter table public.saved_cards enable row level security;

create policy "saved_cards_select_own"
  on public.saved_cards for select
  using (profile_id = auth.uid());

create policy "saved_cards_delete_own"
  on public.saved_cards for delete
  using (profile_id = auth.uid());

-- Sem policy de insert/update: só o service role (server actions) grava aqui.
