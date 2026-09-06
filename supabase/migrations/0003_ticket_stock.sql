-- Reserva/libera estoque de lote de forma atômica, evitando overselling em compras concorrentes.
-- Chamadas sempre feitas pelo backend com a service role key (checkout e cancelamento/estorno).

create or replace function public.reserve_ticket_stock(p_ticket_type_id uuid, p_quantidade integer)
returns boolean
language plpgsql
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
as $$
begin
  update public.ticket_types
  set quantidade_vendida = greatest(0, quantidade_vendida - p_quantidade)
  where id = p_ticket_type_id;
end;
$$;

grant execute on function public.reserve_ticket_stock(uuid, integer) to service_role;
grant execute on function public.release_ticket_stock(uuid, integer) to service_role;
