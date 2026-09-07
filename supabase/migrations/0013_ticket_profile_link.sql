-- Ingresso (inclusive cortesia, que não tem order) pode ser vinculado direto a uma
-- conta (profile) — usado quando o CPF do titular bate com uma conta já cadastrada,
-- ou quando o produtor transfere manualmente depois.
alter table public.tickets add column if not exists profile_id uuid references public.profiles (id);
create index if not exists tickets_profile_id_idx on public.tickets (profile_id);

drop policy if exists "tickets: comprador lê os próprios ingressos" on public.tickets;
create policy "tickets: comprador lê os próprios ingressos"
  on public.tickets for select
  using (
    profile_id = auth.uid()
    or order_id in (select o.id from public.orders o where o.profile_id = auth.uid())
  );
