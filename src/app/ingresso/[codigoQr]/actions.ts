"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits, isValidCpf } from "@/lib/utils";

export interface TransferState {
  error?: string;
  success?: string;
}

/**
 * Autoatendimento: o titular logado transfere o próprio ingresso pra outra conta já
 * cadastrada, informando o CPF dela. Só funciona pra ingresso válido e não-intransferível.
 */
export async function transferirIngressoAutoatendimento(
  _prevState: TransferState,
  formData: FormData,
): Promise<TransferState> {
  const codigoQr = String(formData.get("codigo_qr") ?? "");
  const cpfDestino = onlyDigits(String(formData.get("cpf") ?? ""));

  if (!isValidCpf(cpfDestino)) {
    return { error: "Informe um CPF válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Você precisa estar logado para transferir este ingresso." };
  }

  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, profile_id, status, intransferivel, orders(profile_id)")
    .eq("codigo_qr", codigoQr)
    .maybeSingle();

  if (!ticket) return { error: "Ingresso não encontrado." };

  const donoAtual = ticket.profile_id ?? (ticket.orders as unknown as { profile_id: string | null } | null)?.profile_id ?? null;

  if (donoAtual !== user.id) {
    return { error: "Você não é o titular deste ingresso." };
  }
  if (ticket.intransferivel) {
    return { error: "Este ingresso é intransferível." };
  }
  if (ticket.status !== "valido") {
    return { error: "Só é possível transferir ingressos válidos." };
  }

  const { data: destino } = await admin.from("profiles").select("id, nome").eq("cpf", cpfDestino).maybeSingle();

  if (!destino) {
    return { error: "Nenhuma conta cadastrada com esse CPF." };
  }
  if (destino.id === user.id) {
    return { error: "Esse CPF já é o seu." };
  }

  await admin.from("tickets").update({ profile_id: destino.id }).eq("id", ticket.id);

  revalidatePath(`/ingresso/${codigoQr}`);
  revalidatePath("/meus-ingressos");

  return { success: `Ingresso transferido para ${destino.nome}.` };
}
