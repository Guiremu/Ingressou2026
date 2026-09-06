"use server";

import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/utils";

export interface PerfilState {
  error?: string;
  success?: string;
}

export async function atualizarPerfil(_prevState: PerfilState, formData: FormData): Promise<PerfilState> {
  const profile = await requireLogin();
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = onlyDigits(String(formData.get("telefone") ?? ""));

  if (!nome) return { error: "Informe seu nome." };

  const { error } = await supabase
    .from("profiles")
    .update({ nome, telefone: telefone || null })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return { success: "Dados atualizados." };
}

export async function trocarSenha(_prevState: PerfilState, formData: FormData): Promise<PerfilState> {
  await requireLogin();
  const supabase = await createClient();

  const novaSenha = String(formData.get("nova_senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (novaSenha.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };
  if (novaSenha !== confirmacao) return { error: "As senhas não coincidem." };

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: error.message };

  return { success: "Senha atualizada." };
}
