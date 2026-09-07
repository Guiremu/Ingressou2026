"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RegistrarImpressaoResult {
  ok: boolean;
  /** true quando já havia sido impresso e essa chamada não era forçada — cai na tela de confirmação. */
  jaImpresso: boolean;
}

/**
 * Marca a impressão de um ingresso. Sem `forceReprint`, só marca (e libera renderizar o
 * recibo) se ainda não tinha sido impresso nenhuma vez — update condicional, atômico contra
 * corrida (dois cliques/abas simultâneas não conseguem os dois "vencer" o primeiro print).
 * Com `forceReprint`, incrementa incondicionalmente (usado só depois da tela de confirmação).
 */
export async function registrarImpressao(codigoQr: string, forceReprint: boolean): Promise<RegistrarImpressaoResult> {
  const admin = createAdminClient();

  if (!forceReprint) {
    const { data } = await admin
      .from("tickets")
      .update({ impresso_count: 1, impresso_em: new Date().toISOString(), ultima_impressao_em: new Date().toISOString() })
      .eq("codigo_qr", codigoQr)
      .eq("impresso_count", 0)
      .select("id");

    if (!data || data.length === 0) return { ok: false, jaImpresso: true };
    return { ok: true, jaImpresso: false };
  }

  const { data: ticket } = await admin.from("tickets").select("impresso_count").eq("codigo_qr", codigoQr).single();
  if (!ticket) return { ok: false, jaImpresso: false };

  await admin
    .from("tickets")
    .update({ impresso_count: ticket.impresso_count + 1, ultima_impressao_em: new Date().toISOString() })
    .eq("codigo_qr", codigoQr);

  return { ok: true, jaImpresso: false };
}
