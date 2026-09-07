import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;

export default async function IngressosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, codigo_qr, status, titular_nome, intransferivel, profile_id, usado_em, criado_em, ticket_types(nome), orders(comprador_nome, comprador_email)",
    )
    .eq("event_id", id)
    .eq("is_cortesia", false)
    .order("criado_em", { ascending: false });

  return (
    <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Todos os ingressos</h2>
        <a href={`/produtor/eventos/${event.id}/ingressos/export`}>
          <Button variant="outline" size="sm">
            Exportar CSV
          </Button>
        </a>
      </div>

      <div className="flex flex-col gap-2.5">
        {tickets?.map((t) => {
          const order = t.orders as unknown as { comprador_nome: string; comprador_email: string } | null;
          const tipo = t.ticket_types as unknown as { nome: string } | null;
          return (
            <div key={t.id} className="flex flex-col gap-2 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-white">
                    {t.titular_nome ?? order?.comprador_nome ?? "Comprador"}{" "}
                    {t.intransferivel && <Badge variant="warning">intransferível</Badge>}
                    {t.profile_id && <Badge variant="success">conta vinculada</Badge>}
                  </p>
                  <p className="break-words text-[#93a0b8]">
                    {tipo?.nome} — {order?.comprador_email ?? "—"}
                  </p>
                  <p className="break-all text-xs text-[#5d6b84]">{t.codigo_qr}</p>
                </div>
                <div className="flex-none text-right">
                  <Badge variant={statusVariant[t.status as keyof typeof statusVariant]}>{t.status}</Badge>
                  {t.usado_em && <p className="mt-1 text-xs text-[#5d6b84]">{formatDate(t.usado_em)}</p>}
                </div>
              </div>
            </div>
          );
        })}
        {(!tickets || tickets.length === 0) && <p className="text-[#93a0b8]">Nenhum ingresso emitido ainda.</p>}
      </div>
    </div>
  );
}
