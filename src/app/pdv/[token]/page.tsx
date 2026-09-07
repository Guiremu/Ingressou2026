import { createAdminClient } from "@/lib/supabase/admin";
import { PdvTerminal } from "./pdv-terminal";

export default async function PdvTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: terminal } = await admin
    .from("pdv_terminals")
    .select("id, producer_id, nome_identificacao, ativo, producers(nome_fantasia, razao_social)")
    .eq("token_publico", token)
    .maybeSingle();

  if (!terminal || !terminal.ativo) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#07070b] px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">Link de PDV inválido ou desativado.</p>
      </div>
    );
  }

  const produtor = terminal.producers as unknown as { nome_fantasia: string | null; razao_social: string } | null;
  const produtorNome = produtor?.nome_fantasia ?? produtor?.razao_social ?? "";

  const { data: eventos } = await admin
    .from("events")
    .select("id, titulo, data_inicio")
    .eq("producer_id", terminal.producer_id)
    .eq("status", "publicado")
    .order("data_inicio");

  return (
    <div className="flex flex-1 flex-col bg-[#07070b] px-4 py-8">
      <PdvTerminal
        token={token}
        produtorNome={produtorNome}
        nomeTerminal={terminal.nome_identificacao}
        eventos={eventos ?? []}
      />
    </div>
  );
}
