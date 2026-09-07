"use server";

import { redirect } from "next/navigation";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { POLITICA_REEMBOLSO_PADRAO, CATEGORIAS_EVENTO, CIDADES_ATENDIDAS } from "@/lib/event-defaults";

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
  const imagem = formData.get("imagem");

  if (!titulo || !local || !cidade || !dataInicio) {
    return { error: "Preencha ao menos título, local, cidade e data de início." };
  }

  if (!(imagem instanceof File) || imagem.size === 0) {
    return { error: "A foto de banner do evento é obrigatória." };
  }

  if (!CIDADES_ATENDIDAS.includes(cidade)) {
    return { error: "Selecione uma cidade válida da lista." };
  }
  if (categoria && !CATEGORIAS_EVENTO.includes(categoria)) {
    return { error: "Selecione uma categoria válida da lista." };
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
      politica_reembolso: POLITICA_REEMBOLSO_PADRAO,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: "Não foi possível criar o evento: " + error?.message };
  }

  const extensao = imagem.name.split(".").pop() || "jpg";
  const caminho = `${producer.id}/${event.id}-${Date.now()}.${extensao}`;
  const { error: uploadError } = await admin.storage
    .from("event-images")
    .upload(caminho, await imagem.arrayBuffer(), { contentType: imagem.type, upsert: true });

  if (uploadError) {
    await admin.from("events").delete().eq("id", event.id);
    return { error: "Não foi possível enviar a foto de banner: " + uploadError.message };
  }

  const { data: publicUrl } = admin.storage.from("event-images").getPublicUrl(caminho);
  await admin.from("events").update({ imagem_url: publicUrl.publicUrl }).eq("id", event.id);

  redirect(`/produtor/eventos/${event.id}`);
}
