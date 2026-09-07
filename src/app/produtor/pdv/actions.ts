"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PdvFormState {
  error?: string;
  success?: string;
}

/** Cria o terminal de PDV do produtor (um só por produtor — a loja escolhe o evento na hora). */
export async function criarPdvTerminal(_prevState: PdvFormState, formData: FormData): Promise<PdvFormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const nomeIdentificacao = String(formData.get("nome_identificacao") ?? "").trim() || "Loja parceira";

  const { error } = await admin.from("pdv_terminals").insert({
    producer_id: producer.id,
    nome_identificacao: nomeIdentificacao,
    token_publico: randomUUID(),
  });

  if (error) return { error: "Não foi possível criar o link do PDV: " + error.message };

  revalidatePath("/produtor/pdv");
  return { success: "Link do PDV criado." };
}

/** Ativa/desativa o terminal — desativado, o link público para de aceitar vendas. */
export async function alternarPdvTerminal(terminalId: string, ativo: boolean) {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const { data: terminal } = await admin
    .from("pdv_terminals")
    .select("id, producer_id")
    .eq("id", terminalId)
    .single();

  if (!terminal || terminal.producer_id !== producer.id) throw new Error("Não autorizado.");

  await admin.from("pdv_terminals").update({ ativo }).eq("id", terminalId);
  revalidatePath("/produtor/pdv");
}

/** Gera um novo token pro terminal — útil se o produtor suspeitar que o link vazou. */
export async function regenerarPdvTerminal(terminalId: string): Promise<PdvFormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const { data: terminal } = await admin
    .from("pdv_terminals")
    .select("id, producer_id")
    .eq("id", terminalId)
    .single();

  if (!terminal || terminal.producer_id !== producer.id) return { error: "Não autorizado." };

  await admin.from("pdv_terminals").update({ token_publico: randomUUID() }).eq("id", terminalId);
  revalidatePath("/produtor/pdv");
  return { success: "Link renovado. O link antigo parou de funcionar." };
}
