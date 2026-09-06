export interface TicketQrPayload {
  c: string; // codigo_qr
  s: string; // assinatura_hmac
  e: string; // event_id
}

/** Conteúdo codificado na imagem do QR Code — o necessário para a portaria validar. Sem segredos. */
export function buildQrPayload(ticket: { codigo_qr: string; assinatura_hmac: string; event_id: string }): string {
  const payload: TicketQrPayload = { c: ticket.codigo_qr, s: ticket.assinatura_hmac, e: ticket.event_id };
  return JSON.stringify(payload);
}

export function parseQrPayload(raw: string): TicketQrPayload | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data.c === "string" && typeof data.s === "string" && typeof data.e === "string") {
      return data as TicketQrPayload;
    }
    return null;
  } catch {
    return null;
  }
}
