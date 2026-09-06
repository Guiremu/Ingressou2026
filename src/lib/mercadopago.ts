import "server-only";
import { MercadoPagoConfig, Payment, OAuth } from "mercadopago";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/types/database";
export { calculateSplit } from "@/lib/split-calc";
export type { SplitCalculo } from "@/lib/split-calc";

const PLATFORM_ACCESS_TOKEN = process.env.MERCADOPAGO_PLATFORM_ACCESS_TOKEN;
const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;

/**
 * Busca a taxa percentual do MP para o meio de pagamento/parcelas (tabela editável pelo Gestor ADM).
 * Cai para a linha de 1 parcela do mesmo método se a combinação exata não existir.
 */
export async function getMpFeePercentual(
  supabase: SupabaseClient,
  metodo: PaymentMethod,
  parcelas: number,
): Promise<number> {
  const { data } = await supabase
    .from("mp_fee_table")
    .select("taxa_percentual")
    .eq("metodo_pagamento", metodo)
    .eq("parcelas", parcelas)
    .maybeSingle();

  if (data) return Number(data.taxa_percentual);

  const { data: fallback } = await supabase
    .from("mp_fee_table")
    .select("taxa_percentual")
    .eq("metodo_pagamento", metodo)
    .eq("parcelas", 1)
    .maybeSingle();

  return fallback ? Number(fallback.taxa_percentual) : 0;
}

export async function getPlatformFeePercentual(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("platform_config")
    .select("taxa_plataforma_percentual")
    .eq("id", true)
    .single();

  return data ? Number(data.taxa_plataforma_percentual) : 0.03;
}

/**
 * Cria o pagamento no Mercado Pago usando a conta conectada do produtor (OAuth Marketplace),
 * com `application_fee` = 3% do valor do ingresso, que é automaticamente creditado à conta da
 * plataforma (dona da aplicação OAuth) — o restante vai para o produtor.
 */
export async function createTransparentPayment(params: {
  producerAccessToken: string;
  transactionAmount: number;
  applicationFee: number;
  installments: number;
  paymentMethodId: string;
  token?: string;
  payerEmail: string;
  payerCpf: string;
  description: string;
  externalReference: string;
  notificationUrl: string;
}) {
  const client = new MercadoPagoConfig({ accessToken: params.producerAccessToken });
  const payment = new Payment(client);

  return payment.create({
    body: {
      transaction_amount: params.transactionAmount,
      installments: params.installments,
      payment_method_id: params.paymentMethodId,
      token: params.token,
      description: params.description,
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      application_fee: params.applicationFee,
      payer: {
        email: params.payerEmail,
        identification: { type: "CPF", number: params.payerCpf },
      },
    },
  });
}

export async function getPayment(paymentId: string) {
  if (!PLATFORM_ACCESS_TOKEN) throw new Error("MERCADOPAGO_PLATFORM_ACCESS_TOKEN não configurado");
  const client = new MercadoPagoConfig({ accessToken: PLATFORM_ACCESS_TOKEN });
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

/** URL de autorização OAuth Marketplace para o produtor conectar sua conta MP. */
export function getMpOAuthUrl(producerId: string) {
  if (!MP_CLIENT_ID || !MP_REDIRECT_URI) {
    throw new Error("MERCADOPAGO_CLIENT_ID / MERCADOPAGO_REDIRECT_URI não configurados");
  }
  const url = new URL("https://auth.mercadopago.com.br/authorization");
  url.searchParams.set("client_id", MP_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", MP_REDIRECT_URI);
  url.searchParams.set("state", producerId);
  return url.toString();
}

export async function exchangeMpOAuthCode(code: string) {
  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_REDIRECT_URI) {
    throw new Error("Credenciais OAuth do Mercado Pago não configuradas");
  }
  const client = new MercadoPagoConfig({ accessToken: MP_CLIENT_SECRET });
  const oauth = new OAuth(client);
  return oauth.create({
    body: {
      client_secret: MP_CLIENT_SECRET,
      client_id: MP_CLIENT_ID,
      code,
      redirect_uri: MP_REDIRECT_URI,
    },
  });
}
