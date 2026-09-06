-- Novas rotas institucionais/de conta reservadas.
alter table public.producers drop constraint if exists slug_nao_reservado;
alter table public.producers add constraint slug_nao_reservado check (
  slug not in (
    'validar', 'checkout', 'admin', 'login', 'cadastro', 'signup', 'auth',
    'produtor', 'produtores', 'api', 'ingresso', 'ingressos', 'eventos', 'evento',
    '_next', 'favicon.ico', 'assets', 'public', 'static', 'sobre', 'suporte',
    'termos', 'privacidade', 'meu-ingresso', 'meus-ingressos', 'perfil', 'regras'
  )
);

-- Vincula o pedido ao perfil do comprador quando ele estiver logado no momento da
-- compra (compra sem login continua funcionando normalmente — profile_id fica nulo,
-- e o pedido/ingressos seguem acessíveis pelo link enviado após o pagamento).
alter table public.orders add column if not exists profile_id uuid references public.profiles (id);
create index if not exists orders_profile_id_idx on public.orders (profile_id);

-- "Meus ingressos": o comprador logado enxerga os próprios pedidos — por profile_id
-- (compras feitas logado) ou por e-mail batendo com o do seu perfil (compras feitas
-- como convidado com o mesmo e-mail da conta).
create policy "orders: comprador lê os próprios pedidos"
  on public.orders for select
  using (
    profile_id = auth.uid()
    or comprador_email = (select email from public.profiles where id = auth.uid())
  );

create policy "order_items: comprador lê itens dos próprios pedidos"
  on public.order_items for select
  using (order_id in (
    select o.id from public.orders o
    where o.profile_id = auth.uid()
       or o.comprador_email = (select email from public.profiles where id = auth.uid())
  ));

create policy "tickets: comprador lê os próprios ingressos"
  on public.tickets for select
  using (order_id in (
    select o.id from public.orders o
    where o.profile_id = auth.uid()
       or o.comprador_email = (select email from public.profiles where id = auth.uid())
  ));
