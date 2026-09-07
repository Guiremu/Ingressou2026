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

export interface PerfilPublicoState {
  error?: string;
  success?: string;
}

/**
 * Atualiza o que aparece na página pública do produtor (`/[slug]`): nome de exibição,
 * cidade, bio e as imagens de logo/banner (upload pro bucket `producer-images`).
 */
export async function atualizarPerfilProdutor(
  _prevState: PerfilPublicoState,
  formData: FormData,
): Promise<PerfilPublicoState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();

  const update: Record<string, unknown> = {
    nome_fantasia: nomeFantasia || null,
    cidade: cidade || null,
    descricao: descricao || null,
  };

  async function uploadImagem(campo: "logo" | "banner", coluna: "logo_url" | "banner_url") {
    const arquivo = formData.get(campo);
    if (!(arquivo instanceof File) || arquivo.size === 0) return null;

    const extensao = arquivo.name.split(".").pop() || "jpg";
    const caminho = `${producer.id}/${campo}-${Date.now()}.${extensao}`;
    const { error: uploadError } = await admin.storage
      .from("producer-images")
      .upload(caminho, await arquivo.arrayBuffer(), { contentType: arquivo.type, upsert: true });

    if (uploadError) return uploadError.message;

    const { data: publicUrl } = admin.storage.from("producer-images").getPublicUrl(caminho);
    update[coluna] = publicUrl.publicUrl;
    return null;
  }

  const erroLogo = await uploadImagem("logo", "logo_url");
  if (erroLogo) return { error: "Não foi possível enviar a logo: " + erroLogo };

  const erroBanner = await uploadImagem("banner", "banner_url");
  if (erroBanner) return { error: "Não foi possível enviar o banner: " + erroBanner };

  const { error } = await admin.from("producers").update(update).eq("id", producer.id);
  if (error) return { error: "Não foi possível salvar: " + error.message };

  revalidatePath("/produtor/conta");
  revalidatePath(`/${producer.slug}`);

  return { success: "Perfil público atualizado." };
}
