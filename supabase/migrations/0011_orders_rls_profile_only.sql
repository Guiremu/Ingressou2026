-- Ingressos são sempre vinculados à conta que comprou (profile_id), nunca ao
-- e-mail informado no pedido. As políticas de leitura do comprador (criadas em
-- 0006) tinham um fallback por e-mail pensado pra quando a compra era feita
-- sem login (guest checkout) — isso não existe mais: comprar exige estar
-- logado, então profile_id é sempre preenchido. Removendo o fallback.
drop policy if exists "orders: comprador lê os próprios pedidos" on public.orders;
create policy "orders: comprador lê os próprios pedidos"
  on public.orders for select
  using (profile_id = auth.uid());

drop policy if exists "order_items: comprador lê itens dos próprios pedidos" on public.order_items;
create policy "order_items: comprador lê itens dos próprios pedidos"
  on public.order_items for select
  using (order_id in (select o.id from public.orders o where o.profile_id = auth.uid()));

drop policy if exists "tickets: comprador lê os próprios ingressos" on public.tickets;
create policy "tickets: comprador lê os próprios ingressos"
  on public.tickets for select
  using (order_id in (select o.id from public.orders o where o.profile_id = auth.uid()));
