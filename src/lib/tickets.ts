import "server-only";
import { createHmac } from "node:crypto";

/**
 * Assinatura do ingresso: HMAC(secret, codigo_qr + event_id).
 * Impede que alguém forje um QR Code válido sem conhecer o segredo do servidor.
 */
export function signTicket(codigoQr: string, eventId: string) {
  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) throw new Error("TICKET_HMAC_SECRET não configurado");

  return createHmac("sha256", secret).update(`${codigoQr}:${eventId}`).digest("hex");
}

export function verifyTicketSignature(codigoQr: string, eventId: string, assinatura: string) {
  return signTicket(codigoQr, eventId) === assinatura;
}
