import { notFound } from "next/navigation";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { CheckinScanner } from "@/components/checkin/checkin-scanner";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("id, titulo, producer_id").eq("id", id).single();
  if (!event || event.producer_id !== producer.id) notFound();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("status, usado_em, ticket_types(nome), orders(comprador_nome)")
    .eq("event_id", id)
    .neq("status", "cancelado");

  const total = tickets?.length ?? 0;
  const validados = tickets?.filter((t) => t.status === "usado").length ?? 0;

  const historico = (tickets ?? [])
    .filter((t) => t.status === "usado" && t.usado_em)
    .sort((a, b) => new Date(b.usado_em!).getTime() - new Date(a.usado_em!).getTime())
    .slice(0, 10)
    .map((t) => ({
      nome: (t.orders as unknown as { comprador_nome: string } | null)?.comprador_nome ?? "Cortesia",
      detalhe: (t.ticket_types as unknown as { nome: string } | null)?.nome ?? "",
      hora: new Date(t.usado_em!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cor: "#34D399",
    }));

  return (
    <div className="p-5">
      <CheckinScanner
        eventId={event.id}
        eventoTitulo={event.titulo}
        initialValidados={validados}
        initialTotal={total}
        initialHistorico={historico}
        contexto="Área logada · Portal do Produtor"
        mostrarAvisoPortaria={false}
      />
    </div>
  );
}
