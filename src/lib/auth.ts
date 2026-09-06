import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return data as Profile | null;
}

/** Garante que há um usuário logado com um dos papéis informados; senão redireciona. */
export async function requireRole(roles: UserRole[], redirectTo = "/login") {
  const profile = await getCurrentProfile();

  if (!profile || !roles.includes(profile.role)) {
    redirect(redirectTo);
  }

  return profile;
}
