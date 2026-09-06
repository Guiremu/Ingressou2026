import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signTicket } from "@/lib/tickets";
import type { Order } from "@/types/database";

/**
 * Confirma um pedido pago: gera os ingressos individuais com QR assinado e marca o pedido como pago.
 * Idempotente — chamado pelo webhook do MP e, quando aplicável, logo após a aprovação síncrona
 * de um pagamento com cartão; se o pedido já estiver pago (ou já tiver ingressos gerados), não faz nada.
 */
export async function finalizePaidOrder(orderId: string, mpPaymentId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  if (!order) throw new Error(`Pedido ${orderId} não encontrado`);
  if (order.status === "pago") return { alreadyProcessed: true };

  const { data: existingTickets } = await admin.from("tickets").select("id").eq("order_id", orderId);
  if (existingTickets && existingTickets.length > 0) return { alreadyProcessed: true };

  await admin.from("orders").update({ status: "pago", mp_payment_id: mpPaymentId }).eq("id", orderId);

  for (let i = 0; i < order.quantidade; i++) {
    const { data: ticket } = await admin
      .from("tickets")
      .insert({
        order_id: orderId,
        ticket_type_id: order.ticket_type_id,
        event_id: order.event_id,
        is_cortesia: false,
      })
      .select("id, codigo_qr")
      .single();

    if (ticket) {
      const assinatura = signTicket(ticket.codigo_qr, order.event_id);
      await admin.from("tickets").update({ assinatura_hmac: assinatura }).eq("id", ticket.id);
    }
  }

  return { alreadyProcessed: false };
}

/** Cancela um pedido pendente/recusado e devolve o estoque reservado do lote. */
export async function markOrderFailed(orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
  if (!order || order.status !== "pendente") return;

  await admin.from("orders").update({ status: "cancelado" }).eq("id", orderId);
  await admin.rpc("release_ticket_stock", {
    p_ticket_type_id: order.ticket_type_id,
    p_quantidade: order.quantidade,
  });
}
