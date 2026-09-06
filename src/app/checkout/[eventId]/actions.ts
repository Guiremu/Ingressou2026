"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  calculateSplit,
  createTransparentPayment,
  getMpFeePercentual,
  getPlatformFeePercentual,
} from "@/lib/mercadopago";
import { finalizePaidOrder } from "@/lib/orders";
import { onlyDigits } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";

export interface CheckoutState {
  error?: string;
  orderId?: string;
  status?: "aprovado" | "pendente" | "recusado";
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

export async function criarPedido(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const eventId = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  const quantidade = Number(formData.get("quantidade") ?? 1);
  const compradorNome = String(formData.get("comprador_nome") ?? "").trim();
  const compradorEmail = String(formData.get("comprador_email") ?? "").trim().toLowerCase();
  const compradorCpf = onlyDigits(String(formData.get("comprador_cpf") ?? ""));
  const compradorTelefone = onlyDigits(String(formData.get("comprador_telefone") ?? ""));
  const metodoPagamento = String(formData.get("metodo_pagamento") ?? "pix") as PaymentMethod;
  const parcelas = metodoPagamento === "credito" ? Number(formData.get("parcelas") ?? 1) : 1;
  const cardToken = String(formData.get("card_token") ?? "");
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");

  if (!compradorNome || compradorCpf.length !== 11 || !compradorEmail || quantidade < 1) {
    return { error: "Confira nome, CPF (11 dígitos), e-mail e quantidade." };
  }

  if (metodoPagamento === "credito" && !cardToken) {
    return { error: "Não foi possível processar o cartão. Confira os dados e tente novamente." };
  }

  const admin = createAdminClient();

  const { data: ticketType } = await admin
    .from("ticket_types")
    .select("*, events!inner(id, status, producer_id)")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .single();

  if (!ticketType || ticketType.events.status !== "publicado") {
    return { error: "Lote ou evento não encontrado." };
  }

  if (quantidade > ticketType.max_por_pedido) {
    return { error: `Máximo de ${ticketType.max_por_pedido} ingressos por pedido para este lote.` };
  }

  const { data: producer } = await admin
    .from("producers")
    .select("mp_access_token, status")
    .eq("id", ticketType.events.producer_id)
    .single();

  if (!producer?.mp_access_token || producer.status !== "aprovado") {
    return { error: "Este produtor ainda não está apto a receber pagamentos." };
  }

  const reserved = await admin.rpc("reserve_ticket_stock", {
    p_ticket_type_id: ticketTypeId,
    p_quantidade: quantidade,
  });

  if (!reserved.data) {
    return { error: "Ingressos insuficientes disponíveis neste lote." };
  }

  const valorIngressos = Number(ticketType.preco) * quantidade;
  const supabasePublic = await createClient();
  const [taxaMpPercentual, taxaPlataformaPercentual] = await Promise.all([
    getMpFeePercentual(supabasePublic, metodoPagamento, parcelas),
    getPlatformFeePercentual(supabasePublic),
  ]);

  const split = calculateSplit({
    valorIngressos,
    metodoPagamento,
    parcelas,
    taxaMpPercentual,
    taxaPlataformaPercentual,
  });

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantidade,
      comprador_nome: compradorNome,
      comprador_email: compradorEmail,
      comprador_cpf: compradorCpf,
      comprador_telefone: compradorTelefone || null,
      valor_ingressos: valorIngressos,
      valor_taxa_parcelamento: split.valorTaxaParcelamento,
      valor_total_cobrado: split.valorTotalCobrado,
      metodo_pagamento: metodoPagamento,
      parcelas,
      status: "pendente",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    await admin.rpc("release_ticket_stock", { p_ticket_type_id: ticketTypeId, p_quantidade: quantidade });
    return { error: "Não foi possível criar o pedido: " + orderError?.message };
  }

  await admin.from("payment_splits").insert({
    order_id: order.id,
    valor_bruto: valorIngressos,
    taxa_mp: split.taxaMp,
    taxa_plataforma: split.taxaPlataforma,
    valor_liquido_produtor: split.valorLiquidoProdutor,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const payment = await createTransparentPayment({
      producerAccessToken: producer.mp_access_token,
      transactionAmount: split.valorTotalCobrado,
      applicationFee: split.applicationFee,
      installments: parcelas,
      paymentMethodId: metodoPagamento === "pix" ? "pix" : paymentMethodId,
      token: metodoPagamento === "credito" ? cardToken : undefined,
      payerEmail: compradorEmail,
      payerCpf: compradorCpf,
      description: `Ingresso — ${ticketType.nome}`,
      externalReference: order.id,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
    });

    await admin.from("orders").update({ mp_payment_id: String(payment.id) }).eq("id", order.id);

    if (payment.status === "approved") {
      await finalizePaidOrder(order.id, String(payment.id));
      return { orderId: order.id, status: "aprovado" };
    }

    if (payment.status === "rejected" || payment.status === "cancelled") {
      await admin.rpc("release_ticket_stock", { p_ticket_type_id: ticketTypeId, p_quantidade: quantidade });
      await admin.from("orders").update({ status: "cancelado" }).eq("id", order.id);
      return { error: "Pagamento recusado. Tente outro cartão ou meio de pagamento." };
    }

    // pix / pendente: aguarda confirmação assíncrona via webhook
    const pixData = payment.point_of_interaction?.transaction_data;
    return {
      orderId: order.id,
      status: "pendente",
      pixQrCode: pixData?.qr_code,
      pixQrCodeBase64: pixData?.qr_code_base64,
    };
  } catch (err) {
    await admin.rpc("release_ticket_stock", { p_ticket_type_id: ticketTypeId, p_quantidade: quantidade });
    await admin.from("orders").update({ status: "cancelado" }).eq("id", order.id);
    return { error: "Erro ao processar pagamento no Mercado Pago: " + (err as Error).message };
  }
}
