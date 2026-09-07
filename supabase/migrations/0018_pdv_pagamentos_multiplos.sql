-- Permite vender com mais de uma forma de pagamento na mesma venda do PDV
-- (ex.: parte em dinheiro, parte no cartão) — um pedido pode ter várias linhas aqui.
create table public.pdv_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'debito', 'credito', 'pix')),
  valor numeric(10,2) not null check (valor > 0),
  criado_em timestamptz not null default now()
);
create index pdv_order_payments_order_id_idx on public.pdv_order_payments (order_id);

alter table public.pdv_order_payments enable row level security;

create policy "pdv_order_payments: produtor visualiza dos próprios pedidos"
  on public.pdv_order_payments for select
  using (
    order_id in (
      select o.id from public.orders o
      join public.events e on e.id = o.event_id
      join public.producers p on p.id = e.producer_id
      where p.profile_id = auth.uid()
    )
  );

create policy "pdv_order_payments: admin gerencia tudo"
  on public.pdv_order_payments for all
  using (public.current_role_v() = 'admin');

-- orders.forma_pagamento_pdv passa a guardar um resumo ('misto' quando há mais de
-- uma forma) — o detalhe por forma/valor fica em pdv_order_payments.
alter table public.orders drop constraint orders_forma_pagamento_pdv_check;
alter table public.orders add constraint orders_forma_pagamento_pdv_check
  check (forma_pagamento_pdv in ('dinheiro', 'debito', 'credito', 'pix', 'misto'));
