import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { LoteForm } from "../lote-form";
import { LoteRow } from "../lote-row";
import { EncerrarVendasButton } from "../encerrar-vendas-button";
import type { TicketType } from "@/types/database";

export default async function LotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", id)
    .eq("tipo", "pago")
    .order("ordem", { ascending: true });

  const lotes = (ticketTypes ?? []) as TicketType[];

  return (
    <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Lotes de ingresso</h2>
        <EncerrarVendasButton eventId={event.id} status={event.status} />
      </div>
      <div className="flex flex-col gap-3">
        {lotes.map((tt, i) => (
          <LoteRow key={tt.id} lote={tt} isFirst={i === 0} isLast={i === lotes.length - 1} />
        ))}
        <LoteForm eventId={event.id} />
      </div>
    </div>
  );
}
