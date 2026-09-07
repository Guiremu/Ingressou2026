import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { EventRow, Producer } from "@/types/database";

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

/**
 * Evento + produtor dono, com checagem de posse — usado pelo layout de abas de
 * `/produtor/eventos/[id]/*` e por cada aba. `cache()` deduplica a consulta quando
 * o layout e a página da aba chamam isso na mesma requisição.
 */
export const getEventoDoProdutor = cache(async (eventId: string) => {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single<EventRow>();
  if (!event || event.producer_id !== producer.id) notFound();

  return { event, producer };
});
