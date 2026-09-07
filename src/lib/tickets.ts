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

/**
 * Token de curta duração pra proteger a rota de impressão do PDV — diferente do QR do
 * ingresso (proposital sem login, compartilhável pelo titular), a impressão muda estado
 * (contador de vias) e deve ser operada só pela loja, logo após a venda. Gerado na tela
 * de sucesso da venda, expira sozinho.
 */
export function signPrintToken(codigoQr: string, expiresAt: number) {
  const secret = process.env.TICKET_HMAC_SECRET;
  if (!secret) throw new Error("TICKET_HMAC_SECRET não configurado");

  const assinatura = createHmac("sha256", secret).update(`print:${codigoQr}:${expiresAt}`).digest("hex");
  return `${expiresAt}.${assinatura}`;
}

export function verifyPrintToken(codigoQr: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [expiresAtStr, assinatura] = token.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !assinatura || Date.now() > expiresAt) return false;

  return signPrintToken(codigoQr, expiresAt) === `${expiresAt}.${assinatura}`;
}
