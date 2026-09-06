"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits } from "@/lib/utils";

export interface SignupState {
  error?: string;
}

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const telefone = onlyDigits(String(formData.get("telefone") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!nome || cpf.length !== 11 || !email || password.length < 6) {
    return { error: "Confira nome, CPF (11 dígitos), e-mail e senha (mínimo 6 caracteres)." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
  if (existing) {
    return { error: "Já existe uma conta cadastrada com esse CPF." };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? "Não foi possível criar a conta." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: signUpData.user.id,
    nome,
    cpf,
    telefone: telefone || null,
    email,
    role: "cliente",
  });

  if (profileError) {
    return { error: "Conta criada, mas houve um erro ao salvar o perfil: " + profileError.message };
  }

  redirect("/login?cadastro=ok");
}
