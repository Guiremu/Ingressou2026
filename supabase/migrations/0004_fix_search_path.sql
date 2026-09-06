-- Corrige alerta do linter de segurança do Supabase (function_search_path_mutable):
-- fixa search_path nas funções de estoque para evitar sequestro de search_path.

create or replace function public.reserve_ticket_stock(p_ticket_type_id uuid, p_quantidade integer)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.ticket_types
  set quantidade_vendida = quantidade_vendida + p_quantidade
  where id = p_ticket_type_id
    and quantidade_vendida + p_quantidade <= quantidade_total;

  return found;
end;
$$;

create or replace function public.release_ticket_stock(p_ticket_type_id uuid, p_quantidade integer)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.ticket_types
  set quantidade_vendida = greatest(0, quantidade_vendida - p_quantidade)
  where id = p_ticket_type_id;
end;
$$;
