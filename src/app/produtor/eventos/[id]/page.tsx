import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { EventEditForm } from "./event-edit-form";
import { ExcluirEventoButton } from "./excluir-evento-button";

export default async function VisaoGeralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const [{ data: lotes }, { data: orders }, { count: cortesiasCount }] = await Promise.all([
    supabase.from("ticket_types").select("quantidade_total, quantidade_vendida").eq("event_id", id).eq("tipo", "pago"),
    supabase.from("orders").select("valor_ingressos").eq("event_id", id).eq("status", "pago"),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("is_cortesia", true),
  ]);

  const vendidos = (lotes ?? []).reduce((acc, l) => acc + l.quantidade_vendida, 0);
  const capacidade = (lotes ?? []).reduce((acc, l) => acc + l.quantidade_total, 0);
  const receita = (orders ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0);

  return (
    <>
      <div className="flex flex-wrap overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
        {[
          { label: "Ingressos vendidos", valor: `${vendidos} / ${capacidade || "—"}` },
          { label: "Receita em ingressos", valor: formatCurrency(receita), cor: "text-[var(--accent)]" },
          { label: "Cortesias emitidas", valor: String(cortesiasCount ?? 0) },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            className={`flex flex-1 flex-col gap-1 p-3.5 ${i < arr.length - 1 ? "border-r border-[#263041]" : ""}`}
            style={{ minWidth: 160 }}
          >
            <span className="text-xs text-[#93a0b8]">{stat.label}</span>
            <span className={`font-[var(--font-sora)] text-[21px] font-bold ${stat.cor ?? "text-white"}`}>
              {stat.valor}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
        <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Dados do evento</h2>
        <EventEditForm event={event} />
      </div>

      {event.status === "rascunho" && (
        <div className="rounded-2xl border border-[var(--pink)]/30 bg-[var(--pink)]/5 p-4.5">
          <h2 className="mb-1 font-[var(--font-sora)] text-base font-bold text-white">Zona de risco</h2>
          <p className="mb-3 text-sm text-[#93a0b8]">
            Excluir um evento em rascunho apaga tudo (lotes, cortesias) sem volta.
          </p>
          <ExcluirEventoButton eventId={event.id} />
        </div>
      )}
    </>
  );
}
