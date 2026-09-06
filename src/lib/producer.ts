import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Producer } from "@/types/database";

/** Garante usuário logado como produtor e retorna seu registro em `producers`. */
export async function requireProducer() {
  const profile = await requireRole(["produtor"]);
  const supabase = await createClient();

  const { data: producer } = await supabase
    .from("producers")
    .select("*")
    .eq("profile_id", profile.id)
    .single<Producer>();

  if (!producer) redirect("/login");

  return { profile, producer };
}
