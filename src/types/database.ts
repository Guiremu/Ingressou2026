export type UserRole = "admin" | "produtor" | "colaborador" | "cliente";
export type TipoPessoa = "fisica" | "juridica";
export type ProducerStatus = "pendente" | "aprovado" | "bloqueado";
export type EventStatus = "rascunho" | "publicado" | "encerrado" | "cancelado";
export type TicketTypeTipo = "pago" | "cortesia";
export type PaymentMethod = "pix" | "credito" | "gratuito";
export type OrderStatus = "pendente" | "pago" | "cancelado" | "estornado";
export type TicketStatus = "valido" | "usado" | "cancelado";
export type MotivoCortesia = "funcionario" | "amigo" | "patrocinador" | "outro";

export interface Profile {
  id: string;
  role: UserRole;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string;
  criado_em: string;
}

export interface Producer {
  id: string;
  profile_id: string;
  tipo_pessoa: TipoPessoa;
  cpf: string;
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  logo_url: string | null;
  banner_url: string | null;
  descricao: string | null;
  cidade: string | null;
  mp_user_id: string | null;
  mp_access_token: string | null;
  mp_refresh_token: string | null;
  mp_public_key: string | null;
  status: ProducerStatus;
  slug: string;
  criado_em: string;
}

export interface EventRow {
  id: string;
  producer_id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  imagem_url: string | null;
  local: string | null;
  endereco: string | null;
  cidade: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: EventStatus;
  slug: string;
  politica_reembolso: string | null;
  criado_em: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  quantidade_total: number;
  quantidade_vendida: number;
  data_inicio_venda: string | null;
  data_fim_venda: string | null;
  max_por_pedido: number;
  tipo: TicketTypeTipo;
  ativo: boolean;
  ordem: number;
  criado_em: string;
}

export interface Order {
  id: string;
  event_id: string;
  profile_id: string | null;
  comprador_nome: string;
  comprador_email: string;
  comprador_cpf: string;
  comprador_telefone: string | null;
  valor_ingressos: number;
  valor_taxa_parcelamento: number;
  valor_total_cobrado: number;
  metodo_pagamento: PaymentMethod;
  parcelas: number;
  mp_payment_id: string | null;
  status: OrderStatus;
  criado_em: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  quantidade: number;
  preco_unitario: number;
  criado_em: string;
}

export interface Ticket {
  id: string;
  order_id: string | null;
  ticket_type_id: string;
  event_id: string;
  codigo_qr: string;
  assinatura_hmac: string;
  status: TicketStatus;
  usado_em: string | null;
  validado_por: string | null;
  is_cortesia: boolean;
  motivo_cortesia: MotivoCortesia | null;
  titular_nome: string | null;
  titular_cpf: string | null;
  intransferivel: boolean;
  profile_id: string | null;
  gerado_por: string | null;
  criado_em: string;
}

export interface PaymentSplit {
  id: string;
  order_id: string;
  valor_bruto: number;
  taxa_mp: number;
  taxa_plataforma: number;
  valor_liquido_produtor: number;
  criado_em: string;
}

export interface Validator {
  id: string;
  event_id: string;
  producer_id: string;
  profile_id: string | null;
  token_publico: string | null;
  nome_identificacao: string;
  ativo: boolean;
  expira_em: string | null;
  criado_em: string;
}

export interface MpFeeRow {
  id: string;
  metodo_pagamento: PaymentMethod;
  parcelas: number;
  taxa_percentual: number;
  atualizado_em: string;
}

export interface PlatformConfig {
  id: true;
  taxa_plataforma_percentual: number;
}

export const RESERVED_SLUGS = [
  "validar",
  "checkout",
  "admin",
  "login",
  "cadastro",
  "signup",
  "auth",
  "produtor",
  "produtores",
  "api",
  "ingresso",
  "ingressos",
  "eventos",
  "evento",
  "_next",
  "favicon.ico",
  "assets",
  "public",
  "static",
  "sobre",
  "suporte",
  "termos",
  "privacidade",
  "meu-ingresso",
  "meus-ingressos",
  "perfil",
  "regras",
];
