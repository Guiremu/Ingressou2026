"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TaxaState {
  error?: string;
  success?: string;
}

export async function atualizarTaxaMp(_prevState: TaxaState, formData: FormData): Promise<TaxaState> {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const taxaPercentual = Number(formData.get("taxa_percentual") ?? 0) / 100;

  const { error } = await admin.from("mp_fee_table").update({ taxa_percentual: taxaPercentual }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/taxas");
  return { success: "Taxa atualizada." };
}

export async function atualizarTaxaPlataforma(_prevState: TaxaState, formData: FormData): Promise<TaxaState> {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const taxaPercentual = Number(formData.get("taxa_plataforma") ?? 3) / 100;

  const { error } = await admin
    .from("platform_config")
    .update({ taxa_plataforma_percentual: taxaPercentual })
    .eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/admin/taxas");
  return { success: "Taxa da plataforma atualizada." };
}
