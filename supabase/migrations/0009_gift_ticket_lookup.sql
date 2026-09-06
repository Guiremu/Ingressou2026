-- Suporte a "comprar para outra pessoa": o comprador logado informa o CPF do
-- destinatário e o pedido/ingressos vão direto para os "Meus ingressos" dele.
-- Esta função permite confirmar o nome do destinatário antes de pagar, sem
-- expor a tabela profiles inteira — só pode ser chamada por quem já está
-- logado (authenticated), nunca por visitantes anônimos.
create or replace function public.find_profile_by_cpf(p_cpf text)
returns table (id uuid, nome text)
language sql
security definer
stable
set search_path = public
as $$
  select id, nome from public.profiles where cpf = p_cpf limit 1;
$$;

-- O Supabase concede EXECUTE a anon/authenticated por privilégio padrão do
-- schema ao criar a função — "revoke ... from public" não alcança grants
-- feitos diretamente a essas roles, por isso o revoke explícito de anon abaixo.
revoke execute on function public.find_profile_by_cpf(text) from public;
revoke execute on function public.find_profile_by_cpf(text) from anon;
grant execute on function public.find_profile_by_cpf(text) to authenticated;
