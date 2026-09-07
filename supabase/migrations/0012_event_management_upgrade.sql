-- Suporte à tela de gestão de evento mais completa: editar dados do evento,
-- pausar/reativar/excluir/duplicar/reordenar lotes, cortesias nominais e
-- intransferíveis, e um bucket de storage pra imagem de capa do evento.

alter table public.events add column if not exists politica_reembolso text;

alter table public.ticket_types add column if not exists ativo boolean not null default true;
alter table public.ticket_types add column if not exists ordem integer not null default 0;

alter table public.tickets add column if not exists titular_nome text;
alter table public.tickets add column if not exists titular_cpf text;
alter table public.tickets add column if not exists intransferivel boolean not null default false;

-- Bucket público pra imagem de capa do evento. Upload só acontece via Server Action
-- com o client de service role (bypassa RLS), então não precisamos de policies de
-- escrita em storage.objects — só o bucket público já libera a leitura.
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- validate_ticket passa a retornar dados do titular/intransferível, pra portaria
-- saber que precisa pedir documento na hora do check-in de uma cortesia nominal.
-- Precisa de drop antes: mudar o tipo de retorno (colunas novas) não é permitido via
-- create or replace.
drop function if exists public.validate_ticket(uuid, text, uuid, text);

create function public.validate_ticket(
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
  usado_em timestamptz,
  titular_nome text,
  titular_cpf text,
  intransferivel boolean
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
    return query select false, 'Não autorizado a validar ingressos deste evento.', null::uuid, null::text, null::timestamptz, null::text, null::text, null::boolean;
    return;
  end if;

  select * into v_ticket from public.tickets where codigo_qr = p_codigo_qr and event_id = p_event_id;

  if not found then
    return query select false, 'Ingresso não encontrado para este evento.', null::uuid, null::text, null::timestamptz, null::text, null::text, null::boolean;
    return;
  end if;

  if v_ticket.assinatura_hmac <> p_assinatura_hmac then
    return query select false, 'Assinatura inválida — QR Code adulterado ou falsificado.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean;
    return;
  end if;

  if v_ticket.status = 'usado' then
    return query select false, 'Ingresso já utilizado em ' || to_char(v_ticket.usado_em, 'DD/MM/YYYY HH24:MI') || '.', v_ticket.id, null::text, v_ticket.usado_em, v_ticket.titular_nome, v_ticket.titular_cpf, v_ticket.intransferivel;
    return;
  end if;

  if v_ticket.status = 'cancelado' then
    return query select false, 'Ingresso cancelado.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean;
    return;
  end if;

  update public.tickets
  set status = 'usado', usado_em = now(), validado_por = v_validador_id
  where id = v_ticket.id and status = 'valido';

  if not found then
    return query select false, 'Ingresso já validado simultaneamente em outra portaria.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean;
    return;
  end if;

  return query
    select true, 'Ingresso válido. Acesso liberado.', v_ticket.id, tt.nome, now(), v_ticket.titular_nome, v_ticket.titular_cpf, v_ticket.intransferivel
    from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
end;
$$;

grant execute on function public.validate_ticket(uuid, text, uuid, text) to anon, authenticated;
