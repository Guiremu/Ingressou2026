"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits, slugify } from "@/lib/utils";
import { RESERVED_SLUGS } from "@/types/database";

export interface ProdutorSignupState {
  error?: string;
}

export async function signupProdutor(
  _prevState: ProdutorSignupState,
  formData: FormData,
): Promise<ProdutorSignupState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const telefone = onlyDigits(String(formData.get("telefone") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tipoPessoa = String(formData.get("tipo_pessoa") ?? "fisica") as "fisica" | "juridica";
  const cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const razaoSocial = String(formData.get("razao_social") ?? "").trim();
  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();

  if (!nome || cpf.length !== 11 || !email || password.length < 6 || !razaoSocial) {
    return { error: "Confira nome, CPF (11 dígitos), e-mail, senha (mínimo 6 caracteres) e razão social." };
  }

  if (tipoPessoa === "juridica" && cnpj.length !== 14) {
    return { error: "Informe um CNPJ válido (14 dígitos) para pessoa jurídica." };
  }

  const baseSlug = slugify(nomeFantasia || razaoSocial);
  if (!baseSlug || RESERVED_SLUGS.includes(baseSlug)) {
    return { error: "Não foi possível gerar uma URL válida a partir do nome informado. Tente outro nome." };
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
  if (existingProfile) {
    return { error: "Já existe uma conta cadastrada com esse CPF." };
  }

  let slug = baseSlug;
  for (let i = 1; i < 50; i++) {
    const { data: taken } = await admin.from("producers").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${i + 1}`;
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? "Não foi possível criar a conta." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: signUpData.user.id,
    nome,
    cpf,
    telefone: telefone || null,
    email,
    role: "produtor",
  });

  if (profileError) {
    return { error: "Erro ao salvar o perfil: " + profileError.message };
  }

  const { error: producerError } = await admin.from("producers").insert({
    profile_id: signUpData.user.id,
    tipo_pessoa: tipoPessoa,
    cpf,
    cnpj: tipoPessoa === "juridica" ? cnpj : null,
    razao_social: razaoSocial,
    nome_fantasia: nomeFantasia || null,
    slug,
    status: "pendente",
  });

  if (producerError) {
    return { error: "Erro ao salvar o cadastro de produtor: " + producerError.message };
  }

  redirect("/cadastro/produtor/sucesso");
}
