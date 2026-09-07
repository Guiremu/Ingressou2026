-- PDV (ponto de venda física): um link por produtor pra uma loja parceira vender
-- ingresso presencial (dinheiro/maquininha própria), gerando ingresso de verdade
-- (mesmo estoque, mesmo QR assinado) sem passar pelo Mercado Pago da Ingressou.

-- Mesmo padrão de `validators` (token_publico + ativo), mas sem event_id: a loja
-- escolhe o evento na hora da venda, não fica presa a um evento só.
create table public.pdv_terminals (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers (id) on delete cascade,
  token_publico text not null unique default gen_random_uuid()::text,
  nome_identificacao text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (producer_id)
);

create index pdv_terminals_token_publico_idx on public.pdv_terminals (token_publico);

alter table public.pdv_terminals enable row level security;

create policy "pdv_terminals: produtor gerencia o próprio terminal"
  on public.pdv_terminals for all
  using (producer_id in (select id from public.producers where profile_id = auth.uid()))
  with check (producer_id in (select id from public.producers where profile_id = auth.uid()));

create policy "pdv_terminals: admin gerencia tudo"
  on public.pdv_terminals for all
  using (public.current_role_v() = 'admin');

-- Sem policy pública de select — igual `validators`: o lookup por token na rota
-- /pdv/[token] usa o client de service role (bypassa RLS) + checagem de `ativo` em código.

-- Canal da venda (online = site, pdv = loja física) e forma de pagamento física,
-- só preenchida quando canal = 'pdv'. Vendas do PDV sempre gravam
-- metodo_pagamento = 'gratuito' (semântica já existente: sem gateway, sem split de
-- taxa do MP) — canal/forma_pagamento_pdv carregam a verdade específica do PDV sem
-- mexer em nenhum código que já lê metodo_pagamento pra compra online.
alter table public.orders add column if not exists canal text not null default 'online'
  check (canal in ('online', 'pdv'));
alter table public.orders add column if not exists forma_pagamento_pdv text
  check (forma_pagamento_pdv in ('dinheiro', 'debito', 'credito', 'pix'));
alter table public.orders add column if not exists pdv_terminal_id uuid references public.pdv_terminals (id);

create index orders_canal_idx on public.orders (canal);

-- Controle de impressão do ingresso: permite bloquear reimpressão silenciosa
-- (fraude) mas ainda permitir reimprimir de propósito (ex.: acabou o papel),
-- e vira alerta visível quando impresso mais de uma vez.
alter table public.tickets add column if not exists impresso_count integer not null default 0;
alter table public.tickets add column if not exists impresso_em timestamptz;
alter table public.tickets add column if not exists ultima_impressao_em timestamptz;

-- Reserva a slug "pdv" (mesmo padrão já usado quando "regras"/"perfil" foram
-- reservados em 0006_orders_profile.sql).
alter table public.producers drop constraint if exists slug_nao_reservado;
alter table public.producers add constraint slug_nao_reservado check (
  slug not in (
    'validar', 'checkout', 'admin', 'login', 'cadastro', 'signup', 'auth',
    'produtor', 'produtores', 'api', 'ingresso', 'ingressos', 'eventos', 'evento',
    '_next', 'favicon.ico', 'assets', 'public', 'static', 'sobre', 'suporte',
    'termos', 'privacidade', 'meu-ingresso', 'meus-ingressos', 'perfil', 'regras', 'pdv'
  )
);

-- validate_ticket passa a retornar impresso_count, pra portaria ver na hora da
-- validação se o ingresso já foi impresso mais de uma vez (sinal de fraude).
-- Precisa de drop antes: mudar as colunas de retorno não é permitido via
-- create or replace (mesmo motivo da atualização em 0012).
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
  intransferivel boolean,
  impresso_count integer
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
    return query select false, 'Não autorizado a validar ingressos deste evento.', null::uuid, null::text, null::timestamptz, null::text, null::text, null::boolean, null::integer;
    return;
  end if;

  select * into v_ticket from public.tickets where codigo_qr = p_codigo_qr and event_id = p_event_id;

  if not found then
    return query select false, 'Ingresso não encontrado para este evento.', null::uuid, null::text, null::timestamptz, null::text, null::text, null::boolean, null::integer;
    return;
  end if;

  if v_ticket.assinatura_hmac <> p_assinatura_hmac then
    return query select false, 'Assinatura inválida — QR Code adulterado ou falsificado.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean, v_ticket.impresso_count;
    return;
  end if;

  if v_ticket.status = 'usado' then
    return query select false, 'Ingresso já utilizado em ' || to_char(v_ticket.usado_em, 'DD/MM/YYYY HH24:MI') || '.', v_ticket.id, null::text, v_ticket.usado_em, v_ticket.titular_nome, v_ticket.titular_cpf, v_ticket.intransferivel, v_ticket.impresso_count;
    return;
  end if;

  if v_ticket.status = 'cancelado' then
    return query select false, 'Ingresso cancelado.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean, v_ticket.impresso_count;
    return;
  end if;

  update public.tickets
  set status = 'usado', usado_em = now(), validado_por = v_validador_id
  where id = v_ticket.id and status = 'valido';

  if not found then
    return query select false, 'Ingresso já validado simultaneamente em outra portaria.', v_ticket.id, null::text, null::timestamptz, null::text, null::text, null::boolean, v_ticket.impresso_count;
    return;
  end if;

  return query
    select true, 'Ingresso válido. Acesso liberado.', v_ticket.id, tt.nome, now(), v_ticket.titular_nome, v_ticket.titular_cpf, v_ticket.intransferivel, v_ticket.impresso_count
    from public.ticket_types tt where tt.id = v_ticket.ticket_type_id;
end;
$$;

grant execute on function public.validate_ticket(uuid, text, uuid, text) to anon, authenticated;
