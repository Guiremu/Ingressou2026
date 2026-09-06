-- Ingressou — schema inicial
-- Convenção: todas as tabelas de negócio usam RLS. Papéis: admin, produtor, colaborador, cliente.

create extension if not exists "pgcrypto";

-- =========================================================================
-- profiles (estende auth.users)
-- =========================================================================
create type public.user_role as enum ('admin', 'produtor', 'colaborador', 'cliente');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'cliente',
  nome text not null,
  cpf text not null unique,
  telefone text,
  email text not null unique,
  criado_em timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de usuário. Login pode ser feito por CPF, e-mail ou telefone (resolvido para o e-mail do auth.users antes da autenticação).';

alter table public.profiles enable row level security;

create policy "profiles: usuário lê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admin lê todos os perfis"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "profiles: usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: usuário cria o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Função auxiliar: papel do usuário atual (evita recursão de RLS em outras tabelas)
create or replace function public.current_role_v()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Resolve um identificador de login (CPF, telefone ou e-mail) para o e-mail cadastrado.
-- Usado pelo backend para permitir login por CPF/telefone através do Supabase Auth (que autentica por e-mail).
create or replace function public.resolve_login_identifier(identifier text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from public.profiles
  where cpf = identifier or telefone = identifier or email = identifier
  limit 1;
$$;

grant execute on function public.resolve_login_identifier(text) to anon, authenticated;

-- =========================================================================
-- producers
-- =========================================================================
create type public.tipo_pessoa as enum ('fisica', 'juridica');
create type public.producer_status as enum ('pendente', 'aprovado', 'bloqueado');

create table public.producers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tipo_pessoa public.tipo_pessoa not null default 'fisica',
  cpf text not null,
  cnpj text,
  razao_social text not null,
  nome_fantasia text,
  logo_url text,
  mp_user_id text,
  mp_access_token text,
  mp_refresh_token text,
  mp_public_key text,
  status public.producer_status not null default 'pendente',
  slug text not null unique,
  criado_em timestamptz not null default now(),
  constraint cnpj_obrigatorio_pj check (tipo_pessoa = 'fisica' or cnpj is not null),
  constraint slug_formato check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'),
  constraint slug_nao_reservado check (
    slug not in (
      'validar', 'checkout', 'admin', 'login', 'cadastro', 'signup', 'auth',
      'produtor', 'api', 'ingresso', 'ingressos', 'eventos', 'evento',
      '_next', 'favicon.ico', 'assets', 'public', 'static', 'sobre', 'suporte',
      'termos', 'privacidade', 'meu-ingresso'
    )
  )
);

create index producers_profile_id_idx on public.producers (profile_id);

alter table public.producers enable row level security;

create policy "producers: público lê produtores aprovados"
  on public.producers for select
  using (status = 'aprovado');

create policy "producers: dono lê o próprio cadastro"
  on public.producers for select
  using (profile_id = auth.uid());

create policy "producers: admin lê tudo"
  on public.producers for select
  using (public.current_role_v() = 'admin');

create policy "producers: dono cria seu cadastro"
  on public.producers for insert
  with check (profile_id = auth.uid());

create policy "producers: dono atualiza dados próprios (não status)"
  on public.producers for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and status = (select status from public.producers where id = producers.id));

create policy "producers: admin atualiza tudo"
  on public.producers for update
  using (public.current_role_v() = 'admin');

-- =========================================================================
-- events
-- =========================================================================
create type public.event_status as enum ('rascunho', 'publicado', 'encerrado', 'cancelado');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers (id) on delete cascade,
  titulo text not null,
  descricao text,
  categoria text,
  imagem_url text,
  local text,
  endereco text,
  cidade text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  status public.event_status not null default 'rascunho',
  slug text not null,
  criado_em timestamptz not null default now(),
  unique (producer_id, slug)
);

create index events_status_idx on public.events (status);
create index events_cidade_idx on public.events (cidade);
create index events_data_inicio_idx on public.events (data_inicio);

alter table public.events enable row level security;

create policy "events: público lê eventos publicados"
  on public.events for select
  using (status = 'publicado');

create policy "events: produtor lê os próprios eventos"
  on public.events for select
  using (producer_id in (select id from public.producers where profile_id = auth.uid()));

create policy "events: admin lê tudo"
  on public.events for select
  using (public.current_role_v() = 'admin');

create policy "events: produtor gerencia os próprios eventos"
  on public.events for all
  using (producer_id in (select id from public.producers where profile_id = auth.uid()))
  with check (producer_id in (select id from public.producers where profile_id = auth.uid()));

create policy "events: admin gerencia tudo"
  on public.events for all
  using (public.current_role_v() = 'admin');

-- =========================================================================
-- ticket_types (lotes)
-- =========================================================================
create type public.ticket_type_tipo as enum ('pago', 'cortesia');

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null default 0,
  quantidade_total integer not null,
  quantidade_vendida integer not null default 0,
  data_inicio_venda timestamptz,
  data_fim_venda timestamptz,
  max_por_pedido integer not null default 10,
  tipo public.ticket_type_tipo not null default 'pago',
  criado_em timestamptz not null default now(),
  constraint preco_nao_negativo check (preco >= 0),
  constraint quantidade_disponivel check (quantidade_vendida <= quantidade_total)
);

create index ticket_types_event_id_idx on public.ticket_types (event_id);

alter table public.ticket_types enable row level security;

create policy "ticket_types: público lê lotes de eventos publicados"
  on public.ticket_types for select
  using (event_id in (select id from public.events where status = 'publicado'));

create policy "ticket_types: produtor gerencia lotes dos próprios eventos"
  on public.ticket_types for all
  using (event_id in (
    select e.id from public.events e
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ))
  with check (event_id in (
    select e.id from public.events e
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ));

create policy "ticket_types: admin gerencia tudo"
  on public.ticket_types for all
  using (public.current_role_v() = 'admin');

-- =========================================================================
-- orders
-- =========================================================================
create type public.payment_method as enum ('pix', 'credito');
create type public.order_status as enum ('pendente', 'pago', 'cancelado', 'estornado');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  ticket_type_id uuid not null references public.ticket_types (id),
  quantidade integer not null check (quantidade > 0),
  comprador_nome text not null,
  comprador_email text not null,
  comprador_cpf text not null,
  comprador_telefone text,
  valor_ingressos numeric(10, 2) not null,
  valor_taxa_parcelamento numeric(10, 2) not null default 0,
  valor_total_cobrado numeric(10, 2) not null,
  metodo_pagamento public.payment_method not null,
  parcelas integer not null default 1,
  mp_payment_id text,
  status public.order_status not null default 'pendente',
  criado_em timestamptz not null default now()
);

create index orders_event_id_idx on public.orders (event_id);
create index orders_mp_payment_id_idx on public.orders (mp_payment_id);
create index orders_comprador_email_idx on public.orders (comprador_email);

alter table public.orders enable row level security;

create policy "orders: produtor lê pedidos dos próprios eventos"
  on public.orders for select
  using (event_id in (
    select e.id from public.events e
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ));

create policy "orders: admin lê tudo"
  on public.orders for select
  using (public.current_role_v() = 'admin');

-- Pedidos são criados/atualizados apenas pelo backend (service role / edge functions).
-- Nenhuma policy de insert/update para anon/authenticated — checkout e webhook usam a service role key.

-- =========================================================================
-- tickets
-- =========================================================================
create type public.ticket_status as enum ('valido', 'usado', 'cancelado');
create type public.motivo_cortesia as enum ('funcionario', 'amigo', 'patrocinador', 'outro');

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  ticket_type_id uuid not null references public.ticket_types (id),
  event_id uuid not null references public.events (id),
  codigo_qr uuid not null default gen_random_uuid() unique,
  assinatura_hmac text not null,
  status public.ticket_status not null default 'valido',
  usado_em timestamptz,
  validado_por uuid references public.profiles (id),
  is_cortesia boolean not null default false,
  motivo_cortesia public.motivo_cortesia,
  gerado_por uuid references public.profiles (id),
  criado_em timestamptz not null default now()
);

create index tickets_event_id_idx on public.tickets (event_id);
create index tickets_order_id_idx on public.tickets (order_id);
create index tickets_codigo_qr_idx on public.tickets (codigo_qr);

alter table public.tickets enable row level security;

create policy "tickets: produtor lê ingressos dos próprios eventos"
  on public.tickets for select
  using (event_id in (
    select e.id from public.events e
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ));

create policy "tickets: admin lê tudo"
  on public.tickets for select
  using (public.current_role_v() = 'admin');

create policy "tickets: produtor gera cortesias nos próprios eventos"
  on public.tickets for insert
  with check (
    is_cortesia = true
    and event_id in (
      select e.id from public.events e
      join public.producers p on p.id = e.producer_id
      where p.profile_id = auth.uid()
    )
  );

-- Ingressos pagos são criados pelo backend (service role) após confirmação do pagamento.
-- Atualização de status (check-in) é feita exclusivamente via RPC validate_ticket (security definer).

-- =========================================================================
-- payment_splits
-- =========================================================================
create table public.payment_splits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  valor_bruto numeric(10, 2) not null,
  taxa_mp numeric(10, 2) not null default 0,
  taxa_plataforma numeric(10, 2) not null default 0,
  valor_liquido_produtor numeric(10, 2) not null,
  criado_em timestamptz not null default now()
);

create index payment_splits_order_id_idx on public.payment_splits (order_id);

alter table public.payment_splits enable row level security;

create policy "payment_splits: produtor lê splits dos próprios pedidos"
  on public.payment_splits for select
  using (order_id in (
    select o.id from public.orders o
    join public.events e on e.id = o.event_id
    join public.producers p on p.id = e.producer_id
    where p.profile_id = auth.uid()
  ));

create policy "payment_splits: admin lê tudo"
  on public.payment_splits for select
  using (public.current_role_v() = 'admin');

-- =========================================================================
-- validators (colaboradores de portaria)
-- =========================================================================
create table public.validators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  producer_id uuid not null references public.producers (id) on delete cascade,
  profile_id uuid references public.profiles (id),
  token_publico text unique,
  nome_identificacao text not null,
  ativo boolean not null default true,
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint identificacao_obrigatoria check (profile_id is not null or token_publico is not null)
);

create index validators_event_id_idx on public.validators (event_id);
create index validators_token_publico_idx on public.validators (token_publico);

alter table public.validators enable row level security;

create policy "validators: produtor gerencia colaboradores dos próprios eventos"
  on public.validators for all
  using (producer_id in (select id from public.producers where profile_id = auth.uid()))
  with check (producer_id in (select id from public.producers where profile_id = auth.uid()));

create policy "validators: admin gerencia tudo"
  on public.validators for all
  using (public.current_role_v() = 'admin');

-- =========================================================================
-- mp_fee_table (config de taxas do Mercado Pago, editável pelo Gestor ADM)
-- =========================================================================
create table public.mp_fee_table (
  id uuid primary key default gen_random_uuid(),
  metodo_pagamento public.payment_method not null,
  parcelas integer not null default 1,
  taxa_percentual numeric(5, 4) not null,
  atualizado_em timestamptz not null default now(),
  unique (metodo_pagamento, parcelas)
);

alter table public.mp_fee_table enable row level security;

create policy "mp_fee_table: leitura pública"
  on public.mp_fee_table for select
  using (true);

create policy "mp_fee_table: admin gerencia"
  on public.mp_fee_table for all
  using (public.current_role_v() = 'admin')
  with check (public.current_role_v() = 'admin');

insert into public.mp_fee_table (metodo_pagamento, parcelas, taxa_percentual) values
  ('pix', 1, 0.0099),
  ('credito', 1, 0.0499),
  ('credito', 2, 0.0599),
  ('credito', 3, 0.0699),
  ('credito', 4, 0.0799),
  ('credito', 5, 0.0899),
  ('credito', 6, 0.0999),
  ('credito', 7, 0.1099),
  ('credito', 8, 0.1199),
  ('credito', 9, 0.1299),
  ('credito', 10, 0.1399),
  ('credito', 11, 0.1499),
  ('credito', 12, 0.1599);

comment on table public.mp_fee_table is 'Taxas de referência do Mercado Pago por meio/parcela. Ajustar conforme contrato real da conta MP.';

-- =========================================================================
-- Taxa fixa da plataforma
-- =========================================================================
create table public.platform_config (
  id boolean primary key default true,
  taxa_plataforma_percentual numeric(5, 4) not null default 0.03,
  constraint singleton check (id)
);

insert into public.platform_config (id, taxa_plataforma_percentual) values (true, 0.03);

alter table public.platform_config enable row level security;

create policy "platform_config: leitura pública"
  on public.platform_config for select
  using (true);

create policy "platform_config: admin gerencia"
  on public.platform_config for update
  using (public.current_role_v() = 'admin')
  with check (public.current_role_v() = 'admin');
