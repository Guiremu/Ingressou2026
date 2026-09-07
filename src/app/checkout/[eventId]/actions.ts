"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  calculateSplit,
  createCardTokenFromSavedCard,
  createTransparentPayment,
  findOrCreateMpCustomer,
  getMpFeePercentual,
  getPlatformFeePercentual,
  saveCardForCustomer,
} from "@/lib/mercadopago";
import { finalizePaidOrder } from "@/lib/orders";
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

  const metodoPagamento = String(formData.get("metodo_pagamento") ?? "pix") as PaymentMethod;
  const parcelas = metodoPagamento === "credito" ? Number(formData.get("parcelas") ?? 1) : 1;
  let cardToken = String(formData.get("card_token") ?? "");
  let paymentMethodId = String(formData.get("payment_method_id") ?? "");
  const savedCardId = String(formData.get("saved_card_id") ?? "");
  const securityCode = String(formData.get("security_code") ?? "");
  const salvarCartao = formData.get("salvar_cartao") === "on";

  if (itens.length === 0) {
    return { error: "Selecione ao menos um ingresso." };
  }

  if (metodoPagamento === "credito" && !savedCardId && !cardToken) {
    return { error: "Não foi possível processar o cartão. Confira os dados e tente novamente." };
  }

  if (metodoPagamento === "credito" && savedCardId && !securityCode) {
    return { error: "Informe o CVV do cartão salvo." };
  }

  const supabasePublicAuth = await createClient();
  const {
    data: { user: usuarioLogado },
  } = await supabasePublicAuth.auth.getUser();

  if (!usuarioLogado) {
    return { error: "É necessário estar logado para comprar." };
  }

  const admin = createAdminClient();

  const { data: pagador } = await admin
    .from("profiles")
    .select("id, nome, email, cpf, telefone")
    .eq("id", usuarioLogado.id)
    .single();

  if (!pagador) {
    return { error: "Não foi possível carregar seus dados de conta. Tente sair e entrar novamente." };
  }

  const { data: event } = await admin
    .from("events")
    .select("id, titulo, status, producer_id")
    .eq("id", eventId)
    .single();

  if (!event || event.status !== "publicado") {
    return { error: "Evento não encontrado." };
  }

  const { data: ticketTypes } = await admin
    .from("ticket_types")
    .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida, ativo")
    .eq("event_id", eventId)
    .in(
      "id",
      itens.map((i) => i.ticketTypeId),
    );

  if (!ticketTypes || ticketTypes.length !== itens.length) {
    return { error: "Um ou mais lotes não foram encontrados." };
  }

  const loteInativo = ticketTypes.find((t) => !t.ativo);
  if (loteInativo) {
    return { error: `O lote "${loteInativo.nome}" não está mais disponível para venda.` };
  }

  const valorIngressos = itens.reduce((acc, item) => {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    return acc + Number(tt.preco) * item.quantidade;
  }, 0);
  const gratuito = valorIngressos === 0;

  const { data: producer } = await admin
    .from("producers")
    .select("mp_access_token, status")
    .eq("id", event.producer_id)
    .single();

  if (!gratuito && (!producer?.mp_access_token || producer.status !== "aprovado")) {
    return { error: "Este produtor ainda não está apto a receber pagamentos." };
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

  const [taxaMpPercentual, taxaPlataformaPercentual] = gratuito
    ? [0, 0]
    : await Promise.all([
        getMpFeePercentual(supabasePublicAuth, metodoPagamento, parcelas),
        getPlatformFeePercentual(supabasePublicAuth),
      ]);

  const split = calculateSplit({
    valorIngressos,
    metodoPagamento: gratuito ? "gratuito" : metodoPagamento,
    parcelas: gratuito ? 1 : parcelas,
    taxaMpPercentual,
    taxaPlataformaPercentual,
  });

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      event_id: eventId,
      profile_id: pagador.id,
      comprador_nome: pagador.nome,
      comprador_email: pagador.email,
      comprador_cpf: pagador.cpf,
      comprador_telefone: pagador.telefone,
      valor_ingressos: valorIngressos,
      valor_taxa_parcelamento: split.valorTaxaParcelamento,
      valor_total_cobrado: split.valorTotalCobrado,
      metodo_pagamento: gratuito ? "gratuito" : metodoPagamento,
      parcelas: gratuito ? 1 : parcelas,
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

  if (gratuito) {
    await finalizePaidOrder(order.id, null);
    return { orderId: order.id, status: "aprovado" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let mpCustomerId: string | undefined;

  try {
    if (metodoPagamento === "credito" && savedCardId) {
      const { data: cartaoSalvo } = await admin
        .from("saved_cards")
        .select("mp_customer_id, mp_card_id, payment_method_id")
        .eq("id", savedCardId)
        .eq("profile_id", pagador.id)
        .eq("producer_id", event.producer_id)
        .single();

      if (!cartaoSalvo) {
        await liberarTudo();
        await admin.from("orders").update({ status: "cancelado" }).eq("id", order.id);
        return { error: "Cartão salvo não encontrado. Tente cadastrar novamente." };
      }

      cardToken = await createCardTokenFromSavedCard({
        producerAccessToken: producer!.mp_access_token!,
        cardId: cartaoSalvo.mp_card_id,
        customerId: cartaoSalvo.mp_customer_id,
        securityCode,
      });
      paymentMethodId = cartaoSalvo.payment_method_id;
      mpCustomerId = cartaoSalvo.mp_customer_id;
    } else if (metodoPagamento === "credito" && salvarCartao) {
      try {
        const customerId = await findOrCreateMpCustomer(producer!.mp_access_token!, pagador.email, pagador.nome);
        const savedCard = await saveCardForCustomer(producer!.mp_access_token!, customerId, cardToken);
        if (savedCard.id) {
          await admin.from("saved_cards").insert({
            profile_id: pagador.id,
            producer_id: event.producer_id,
            mp_customer_id: customerId,
            mp_card_id: savedCard.id,
            last_four_digits: savedCard.last_four_digits ?? "",
            payment_method_id: savedCard.payment_method?.id ?? paymentMethodId,
            cardholder_name: savedCard.cardholder?.name ?? null,
          });
          mpCustomerId = customerId;
        }
      } catch {
        // Não bloqueia a compra se o cartão não puder ser salvo — segue com o pagamento normal.
      }
    }

    const payment = await createTransparentPayment({
      producerAccessToken: producer!.mp_access_token!,
      transactionAmount: split.valorTotalCobrado,
      applicationFee: split.applicationFee,
      installments: parcelas,
      paymentMethodId: metodoPagamento === "pix" ? "pix" : paymentMethodId,
      token: metodoPagamento === "credito" ? cardToken : undefined,
      payerEmail: pagador.email,
      payerCpf: pagador.cpf,
      description: `Ingressos — ${event.titulo}`,
      externalReference: order.id,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
      mpCustomerId,
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
