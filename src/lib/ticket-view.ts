import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildQrPayload } from "@/lib/qr-payload";

/** Dados derivados de um ingresso, reaproveitados pela página, o PDF e a imagem exportáveis. */
export async function getTicketViewData(codigoQr: string) {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select(
      "id, codigo_qr, assinatura_hmac, status, event_id, order_id, titular_nome, intransferivel, ticket_types(nome), events(titulo, local, endereco, cidade, data_inicio, producers(nome_fantasia, razao_social)), orders(comprador_nome)",
    )
    .eq("codigo_qr", codigoQr)
    .maybeSingle();

  if (!ticket) return null;

  const event = ticket.events as unknown as {
    titulo: string;
    local: string | null;
    endereco: string | null;
    cidade: string | null;
    data_inicio: string;
    producers: { nome_fantasia: string | null; razao_social: string } | null;
  } | null;

  const loteNome = (ticket.ticket_types as unknown as { nome: string } | null)?.nome ?? "";
  const compradorNome =
    ticket.titular_nome ?? (ticket.orders as unknown as { comprador_nome: string } | null)?.comprador_nome ?? "Cortesia";
  const produtorNome = event?.producers ? (event.producers.nome_fantasia ?? event.producers.razao_social) : "Cortesia";

  const codigoCurto = ticket.codigo_qr.replace(/-/g, "").slice(0, 8).toUpperCase();
  const codigoFormatado = `${codigoCurto.slice(0, 4)}-${codigoCurto.slice(4)}`;
  const numeroPedido = ticket.order_id
    ? `#IGR-${ticket.order_id.replace(/-/g, "").slice(0, 5).toUpperCase()}`
    : "Cortesia";

  const qrPayload = buildQrPayload({
    codigo_qr: ticket.codigo_qr,
    assinatura_hmac: ticket.assinatura_hmac,
    event_id: ticket.event_id,
  });

  return {
    ticket,
    event,
    loteNome,
    compradorNome,
    produtorNome,
    codigoFormatado,
    numeroPedido,
    qrPayload,
  };
}
