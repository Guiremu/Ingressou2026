import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { CortesiaForm } from "../cortesia-form";
import { CortesiaRow } from "../cortesia-row";
import type { Ticket } from "@/types/database";

export default async function CortesiasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const { data: cortesias } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", id)
    .eq("is_cortesia", true)
    .order("criado_em", { ascending: false });

  const lista = (cortesias ?? []) as Ticket[];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
        <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Gerar cortesia</h2>
        <CortesiaForm eventId={event.id} />
      </div>

      <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Cortesias geradas</h2>
          <span className="text-xs text-[#93a0b8]">{lista.length} no total</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {lista.map((c) => (
            <CortesiaRow key={c.id} cortesia={c} />
          ))}
          {lista.length === 0 && <p className="text-sm text-[#93a0b8]">Nenhuma cortesia gerada ainda.</p>}
        </div>
      </div>
    </div>
  );
}
