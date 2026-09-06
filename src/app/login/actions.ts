"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/utils";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifierRaw = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifierRaw || !password) {
    return { error: "Informe seu CPF, e-mail ou telefone e a senha." };
  }

  // CPF/telefone são normalizados (só dígitos) antes de buscar; e-mail é normalizado para minúsculas
  // (teclados de celular costumam capitalizar a primeira letra de campos de texto automaticamente).
  const identifier = identifierRaw.includes("@")
    ? identifierRaw.toLowerCase()
    : onlyDigits(identifierRaw);

  const supabase = await createClient();

  const { data: email, error: resolveError } = await supabase.rpc("resolve_login_identifier", {
    identifier,
  });

  if (resolveError || !email) {
    return { error: "Não encontramos uma conta com esse CPF, e-mail ou telefone." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Senha incorreta ou conta não confirmada." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Só aceita caminhos internos (começando com "/" mas não "//", que seria um
  // redirecionamento para outro domínio).
  const redirectTo = String(formData.get("redirect") ?? "");
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) redirect(redirectTo);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "produtor" || profile?.role === "colaborador") redirect("/produtor");
  redirect("/");
}
