"use server";

import { revalidatePath } from "next/cache";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";

/** Desconecta a conta Mercado Pago do produtor, permitindo reconectar (ex: com outra conta). */
export async function desconectarMercadoPago() {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  await admin
    .from("producers")
    .update({ mp_user_id: null, mp_access_token: null, mp_refresh_token: null, mp_public_key: null })
    .eq("id", producer.id);

  revalidatePath("/produtor/conta");
}
