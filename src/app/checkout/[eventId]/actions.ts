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

interface ItemSelecionado {
  ticketTypeId: string;
  quantidade: number;
}

export async function criarPedido(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const eventId = String(formData.get("event_id") ?? "");
  let itens: ItemSelecionado[] = [];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { error: "Carrinho inválido." };
  }
  itens = itens.filter((i) => i.quantidade > 0);

  const compradorNome = String(formData.get("comprador_nome") ?? "").trim();
  const compradorEmail = String(formData.get("comprador_email") ?? "").trim().toLowerCase();
  const compradorCpf = onlyDigits(String(formData.get("comprador_cpf") ?? ""));
  const compradorTelefone = onlyDigits(String(formData.get("comprador_telefone") ?? ""));
  const metodoPagamento = String(formData.get("metodo_pagamento") ?? "pix") as PaymentMethod;
  const parcelas = metodoPagamento === "credito" ? Number(formData.get("parcelas") ?? 1) : 1;
  const cardToken = String(formData.get("card_token") ?? "");
  const paymentMethodId = String(formData.get("payment_method_id") ?? "");

  if (itens.length === 0) {
    return { error: "Selecione ao menos um ingresso." };
  }

  if (!compradorNome || compradorCpf.length !== 11 || !compradorEmail) {
    return { error: "Confira nome, CPF (11 dígitos) e e-mail." };
  }

  if (metodoPagamento === "credito" && !cardToken) {
    return { error: "Não foi possível processar o cartão. Confira os dados e tente novamente." };
  }

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, titulo, status, producer_id")
    .eq("id", eventId)
    .single();

  if (!event || event.status !== "publicado") {
    return { error: "Evento não encontrado." };
  }

  const { data: producer } = await admin
    .from("producers")
    .select("mp_access_token, status")
    .eq("id", event.producer_id)
    .single();

  if (!producer?.mp_access_token || producer.status !== "aprovado") {
    return { error: "Este produtor ainda não está apto a receber pagamentos." };
  }

  const { data: ticketTypes } = await admin
    .from("ticket_types")
    .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida")
    .eq("event_id", eventId)
    .in(
      "id",
      itens.map((i) => i.ticketTypeId),
    );

  if (!ticketTypes || ticketTypes.length !== itens.length) {
    return { error: "Um ou mais lotes não foram encontrados." };
  }

  const reservados: ItemSelecionado[] = [];

  for (const item of itens) {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    if (item.quantidade > tt.max_por_pedido) {
      for (const r of reservados) {
        await admin.rpc("release_ticket_stock", { p_ticket_type_id: r.ticketTypeId, p_quantidade: r.quantidade });
      }
      return { error: `Máximo de ${tt.max_por_pedido} ingressos por pedido para o lote "${tt.nome}".` };
    }

    const reserved = await admin.rpc("reserve_ticket_stock", {
      p_ticket_type_id: item.ticketTypeId,
      p_quantidade: item.quantidade,
    });

    if (!reserved.data) {
      for (const r of reservados) {
        await admin.rpc("release_ticket_stock", { p_ticket_type_id: r.ticketTypeId, p_quantidade: r.quantidade });
      }
      return { error: `Ingressos insuficientes disponíveis no lote "${tt.nome}".` };
    }
    reservados.push(item);
  }

  const valorIngressos = itens.reduce((acc, item) => {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    return acc + Number(tt.preco) * item.quantidade;
  }, 0);

  const supabasePublic = await createClient();
  const [taxaMpPercentual, taxaPlataformaPercentual, {
    data: { user: usuarioLogado },
  }] = await Promise.all([
    getMpFeePercentual(supabasePublic, metodoPagamento, parcelas),
    getPlatformFeePercentual(supabasePublic),
    supabasePublic.auth.getUser(),
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
      profile_id: usuarioLogado?.id ?? null,
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

  async function liberarTudo() {
    for (const r of reservados) {
      await admin.rpc("release_ticket_stock", { p_ticket_type_id: r.ticketTypeId, p_quantidade: r.quantidade });
    }
  }

  if (orderError || !order) {
    await liberarTudo();
    return { error: "Não foi possível criar o pedido: " + orderError?.message };
  }

  await admin.from("order_items").insert(
    itens.map((item) => ({
      order_id: order.id,
      ticket_type_id: item.ticketTypeId,
      quantidade: item.quantidade,
      preco_unitario: Number(ticketTypes.find((t) => t.id === item.ticketTypeId)!.preco),
    })),
  );

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
      description: `Ingressos — ${event.titulo}`,
      externalReference: order.id,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
    });

    await admin.from("orders").update({ mp_payment_id: String(payment.id) }).eq("id", order.id);

    if (payment.status === "approved") {
      await finalizePaidOrder(order.id, String(payment.id));
      return { orderId: order.id, status: "aprovado" };
    }

    if (payment.status === "rejected" || payment.status === "cancelled") {
      await liberarTudo();
      await admin.from("orders").update({ status: "cancelado" }).eq("id", order.id);
      return { error: "Pagamento recusado. Tente outro cartão ou meio de pagamento." };
    }

    const pixData = payment.point_of_interaction?.transaction_data;
    return {
      orderId: order.id,
      status: "pendente",
      pixQrCode: pixData?.qr_code,
      pixQrCodeBase64: pixData?.qr_code_base64,
    };
  } catch (err) {
    await liberarTudo();
    await admin.from("orders").update({ status: "cancelado" }).eq("id", order.id);
    return { error: "Erro ao processar pagamento no Mercado Pago: " + (err as Error).message };
  }
}
