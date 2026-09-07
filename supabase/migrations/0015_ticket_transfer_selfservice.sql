-- A policy anterior deixava o comprador original enxergar o ingresso pra sempre (via
-- order_id), mesmo depois de transferido pra outra conta (profile_id preenchido) —
-- o que furava o propósito da transferência (ex-titular ainda via o QR). Agora só conta
-- o vínculo por order_id enquanto o ingresso não tiver sido explicitamente transferido
-- (profile_id ainda nulo).
drop policy if exists "tickets: comprador lê os próprios ingressos" on public.tickets;
create policy "tickets: comprador lê os próprios ingressos"
  on public.tickets for select
  using (
    profile_id = auth.uid()
    or (profile_id is null and order_id in (select o.id from public.orders o where o.profile_id = auth.uid()))
  );
