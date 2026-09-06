-- Banner, descrição e cidade pública do produtor (página /[slug]).
alter table public.producers add column if not exists banner_url text;
alter table public.producers add column if not exists descricao text;
alter table public.producers add column if not exists cidade text;

-- "produtores" agora é rota reservada do site (diretório de produtores).
alter table public.producers drop constraint if exists slug_nao_reservado;
alter table public.producers add constraint slug_nao_reservado check (
  slug not in (
    'validar', 'checkout', 'admin', 'login', 'cadastro', 'signup', 'auth',
    'produtor', 'produtores', 'api', 'ingresso', 'ingressos', 'eventos', 'evento',
    '_next', 'favicon.ico', 'assets', 'public', 'static', 'sobre', 'suporte',
    'termos', 'privacidade', 'meu-ingresso'
  )
);

-- Descrição curta opcional do lote (ex: "Acesso à área de pista. Meia-entrada
-- mediante comprovação."), exibida na ficha do evento.
alter table public.ticket_types add column if not exists descricao text;

-- Carrinho multi-lote: um pedido pode conter várias linhas (lotes diferentes, cada
-- um com sua quantidade), em vez de um único ticket_type_id/quantidade por pedido.

alter table public.orders drop column if exists ticket_type_id;
alter table public.orders drop column if exists quantidade;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null,
  criado_em timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_ticket_type_id_idx on public.order_items (ticket_type_id);

alter table public.order_items enable row level security;

create policy "order_items: produtor lê itens dos próprios pedidos"
  on public.order_items for select
  using (order_id in (
    select o.id from public.orders o
    join public.events e on e.id = o.event_id
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ));

create policy "order_items: admin lê tudo"
  on public.order_items for select
  using (public.current_role_v() = 'admin');

-- Itens são criados apenas pelo backend (service role) junto com o pedido.
