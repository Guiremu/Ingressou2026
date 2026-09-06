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

  return (
    <div className="flex flex-1 flex-col items-center gap-4 px-4 py-8">
      <h1 className="text-xl font-bold text-neutral-900">Check-in — {event.titulo}</h1>
      <p className="text-sm text-neutral-500">Portaria: {validator.nome_identificacao}</p>
      <CheckinScanner eventId={event.id} tokenPublico={token} />
    </div>
  );
}

function ErroAcesso({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
      <p className="text-neutral-600">{mensagem}</p>
    </div>
  );
}
