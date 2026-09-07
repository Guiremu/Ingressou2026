import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { signTicket } from "@/lib/tickets";
import type { Order, OrderItem } from "@/types/database";

/**
 * Confirma um pedido pago: gera os ingressos individuais (um por unidade de cada
 * linha do carrinho) com QR assinado e marca o pedido como pago. Idempotente —
 * chamado pelo webhook do MP e, quando aplicável, logo após a aprovação síncrona
 * de um pagamento com cartão; se o pedido já estiver pago (ou já tiver ingressos
 * gerados), não faz nada.
 */
export async function finalizePaidOrder(orderId: string, mpPaymentId: string | null) {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  if (!order) throw new Error(`Pedido ${orderId} não encontrado`);
  if (order.status === "pago") return { alreadyProcessed: true };

  const { data: existingTickets } = await admin.from("tickets").select("id").eq("order_id", orderId);
  if (existingTickets && existingTickets.length > 0) return { alreadyProcessed: true };

  const { data: items } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .returns<OrderItem[]>();

  await admin.from("orders").update({ status: "pago", mp_payment_id: mpPaymentId }).eq("id", orderId);

  for (const item of items ?? []) {
    for (let i = 0; i < item.quantidade; i++) {
      const codigoQr = randomUUID();
      await admin.from("tickets").insert({
        order_id: orderId,
        ticket_type_id: item.ticket_type_id,
        event_id: order.event_id,
        is_cortesia: false,
        codigo_qr: codigoQr,
        assinatura_hmac: signTicket(codigoQr, order.event_id),
      });
    }
  }

  return { alreadyProcessed: false };
}

/** Cancela um pedido pendente/recusado e devolve o estoque reservado de cada lote. */
export async function markOrderFailed(orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  if (!order || order.status !== "pendente") return;

  await admin.from("orders").update({ status: "cancelado" }).eq("id", orderId);

  const { data: items } = await admin
    .from("order_items")
    .select("ticket_type_id, quantidade")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    await admin.rpc("release_ticket_stock", {
      p_ticket_type_id: item.ticket_type_id,
      p_quantidade: item.quantidade,
    });
  }
}
