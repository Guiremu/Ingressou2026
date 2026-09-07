import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckinScanner } from "@/components/checkin/checkin-scanner";

export default async function ValidarPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { eventSlug } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const admin = createAdminClient();

  const { data: validator } = await admin
    .from("validators")
    .select("id, ativo, expira_em, event_id, nome_identificacao, events(id, slug, titulo)")
    .eq("token_publico", token)
    .maybeSingle();

  const event = validator?.events as unknown as { id: string; slug: string; titulo: string } | null;

  if (!validator || !event || event.slug !== eventSlug) notFound();

  if (!validator.ativo) {
    return <ErroAcesso mensagem="Este link de validação foi desativado pelo produtor." />;
  }

  if (validator.expira_em && new Date(validator.expira_em) < new Date()) {
    return <ErroAcesso mensagem="Este link de validação expirou." />;
  }

  const { data: tickets } = await admin
    .from("tickets")
    .select("status, usado_em, titular_nome, ticket_types(nome), orders(comprador_nome)")
    .eq("event_id", event.id)
    .neq("status", "cancelado");

  const total = tickets?.length ?? 0;
  const validados = tickets?.filter((t) => t.status === "usado").length ?? 0;

  const historico = (tickets ?? [])
    .filter((t) => t.status === "usado" && t.usado_em)
    .sort((a, b) => new Date(b.usado_em!).getTime() - new Date(a.usado_em!).getTime())
    .slice(0, 10)
    .map((t) => ({
      nome: t.titular_nome ?? (t.orders as unknown as { comprador_nome: string } | null)?.comprador_nome ?? "Cortesia",
      detalhe: (t.ticket_types as unknown as { nome: string } | null)?.nome ?? "",
      hora: new Date(t.usado_em!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cor: "#34D399",
    }));

  return (
    <div className="flex flex-1 flex-col bg-[#07070b] px-4 py-8">
      <CheckinScanner
        eventId={event.id}
        tokenPublico={token}
        eventoTitulo={`${event.titulo} · Portaria: ${validator.nome_identificacao}`}
        initialValidados={validados}
        initialTotal={total}
        initialHistorico={historico}
        contexto="Link de portaria · sem login"
        mostrarAvisoPortaria={true}
      />
    </div>
  );
}

function ErroAcesso({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#07070b] px-4 py-16 text-center">
      <p className="text-[var(--text-muted)]">{mensagem}</p>
    </div>
  );
}
