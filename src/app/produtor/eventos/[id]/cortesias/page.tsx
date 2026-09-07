import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { CortesiaForm } from "../cortesia-form";
import { TransferirForm } from "../transferir-form";
import type { Ticket } from "@/types/database";

const motivoLabel = { funcionario: "Funcionário", amigo: "Amigo", patrocinador: "Patrocinador", outro: "Outro" };

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
            <div key={c.id} className="flex flex-col gap-2 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {c.titular_nome ?? "Sem nome definido"}{" "}
                    {c.intransferivel && <Badge variant="warning">intransferível</Badge>}
                    {c.profile_id && <Badge variant="success">conta vinculada</Badge>}
                  </p>
                  <p className="text-sm text-[#93a0b8]">
                    {motivoLabel[c.motivo_cortesia ?? "outro"]}
                    {c.titular_cpf && ` · CPF ${c.titular_cpf}`}
                  </p>
                </div>
                <Badge variant={c.status === "usado" ? "secondary" : c.status === "cancelado" ? "destructive" : "success"}>
                  {c.status}
                </Badge>
              </div>
              {!c.profile_id && <TransferirForm ticketId={c.id} />}
            </div>
          ))}
          {lista.length === 0 && <p className="text-sm text-[#93a0b8]">Nenhuma cortesia gerada ainda.</p>}
        </div>
      </div>
    </div>
  );
}
