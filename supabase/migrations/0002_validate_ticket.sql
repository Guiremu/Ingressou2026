-- RPC de validação de ingresso (check-in). Atômica: usa UPDATE ... WHERE status = 'valido'
-- para garantir que duas portarias simultâneas não validem o mesmo ingresso duas vezes.
-- Aceita validação por usuário logado (produtor/colaborador com profile) OU por token
-- público de um validator ativo e não expirado.

create or replace function public.validate_ticket(
  p_codigo_qr uuid,
  p_assinatura_hmac text,
  p_event_id uuid,
  p_token_publico text default null
)
returns table (
  ok boolean,
  mensagem text,
  ticket_id uuid,
  nome_lote text,
  usado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_validador_id uuid;
  v_autorizado boolean := false;
begin
  -- Autorização: usuário autenticado deve ser produtor/colaborador do evento,
  -- OU o token público informado deve corresponder a um validator ativo do evento.
  if auth.uid() is not null then
    select exists (
      select 1 from public.producers p
      join public.events e on e.producer_id = p.id
      where e.id = p_event_id and p.profile_id = auth.uid()
    ) or exists (
      select 1 from public.validators v
      where v.event_id = p_event_id and v.profile_id = auth.uid() and v.ativo
        and (v.expira_em is null or v.expira_em > now())
    ) into v_autorizado;
    v_validador_id := auth.uid();
  end if;

  if not v_autorizado and p_token_publico is not null then
    select exists (
      select 1 from public.validators v
      where v.event_id = p_event_id and v.token_publico = p_token_publico and v.ativo
        and (v.expira_em is null or v.expira_em > now())
    ) into v_autorizado;
  end if;

  if not v_autorizado then
    return query select false, 'Não autorizado a validar ingressos deste evento.', null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select * into v_ticket from public.tickets where codigo_qr = p_codigo_qr and event_id = p_event_id;

  if not found then
    return query select false, 'Ingresso não encontrado para este evento.', null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if v_ticket.assinatura_hmac <> p_assinatura_hmac then
    return query select false, 'Assinatura inválida — QR Code adulterado ou falsificado.', v_ticket.id, null::text, null::timestamptz;
    return;
  end if;

  if v_ticket.status = 'usado' then
    return query select false, 'Ingresso já utilizado em ' || to_char(v_ticket.usado_em, 'DD/MM/YYYY HH24:MI') || '.', v_ticket.id, null::text, v_ticket.usado_em;
    return;
  end if;

  if v_ticket.status = 'cancelado' then
    return query select false, 'Ingresso cancelado.', v_ticket.id, null::text, null::timestamptz;
    return;
  end if;

  update public.tickets
  set status = 'usado', usado_em = now(), validado_por = v_validador_id
  where id = v_ticket.id and status = 'valido';

  if not found then
    -- Corrida: outra validação concorrente venceu entre o select e o update.
    return query select false, 'Ingresso já validado simultaneamente em outra portaria.', v_ticket.id, null::text, null::timestamptz;
    return;
  end if;

  return query
    select true, 'Ingresso válido. Acesso liberado.', v_ticket.id, tt.nome, now()
    from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
end;
$$;

grant execute on function public.validate_ticket(uuid, text, uuid, text) to anon, authenticated;
