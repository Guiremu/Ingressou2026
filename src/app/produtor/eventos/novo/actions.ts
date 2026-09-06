"use server";

import { redirect } from "next/navigation";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export interface NovoEventoState {
  error?: string;
}

export async function criarEvento(_prevState: NovoEventoState, formData: FormData): Promise<NovoEventoState> {
  const { producer } = await requireProducer();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");

  if (!titulo || !local || !cidade || !dataInicio) {
    return { error: "Preencha ao menos título, local, cidade e data de início." };
  }

  const admin = createAdminClient();
  const baseSlug = slugify(titulo) || "evento";
  let slug = baseSlug;
  for (let i = 1; i < 50; i++) {
    const { data: taken } = await admin
      .from("events")
      .select("id")
      .eq("producer_id", producer.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${i + 1}`;
  }

  const { data: event, error } = await admin
    .from("events")
    .insert({
      producer_id: producer.id,
      titulo,
      descricao: descricao || null,
      categoria: categoria || null,
      local,
      endereco: endereco || null,
      cidade,
      data_inicio: new Date(dataInicio).toISOString(),
      data_fim: dataFim ? new Date(dataFim).toISOString() : null,
      status: "rascunho",
      slug,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: "Não foi possível criar o evento: " + error?.message };
  }

  redirect(`/produtor/eventos/${event.id}`);
}
