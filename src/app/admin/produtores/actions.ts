"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProducerStatus } from "@/types/database";

export async function atualizarStatusProdutor(producerId: string, status: ProducerStatus) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const { error } = await admin.from("producers").update({ status }).eq("id", producerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/produtores");
}
