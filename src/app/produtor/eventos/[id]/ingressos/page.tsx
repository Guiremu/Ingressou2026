import { notFound } from "next/navigation";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;

export default async function IngressosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("id, titulo, producer_id").eq("id", id).single();
  if (!event || event.producer_id !== producer.id) notFound();

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, codigo_qr, status, is_cortesia, titular_nome, intransferivel, usado_em, criado_em, ticket_types(nome), orders(comprador_nome, comprador_email)",
    )
    .eq("event_id", id)
    .order("criado_em", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Ingressos — {event.titulo}</h1>
        <a href={`/produtor/eventos/${event.id}/ingressos/export`}>
          <Button variant="outline">Exportar CSV</Button>
        </a>
      </div>

      <div className="flex flex-col gap-2">
        {tickets?.map((t) => {
          const order = t.orders as unknown as { comprador_nome: string; comprador_email: string } | null;
          const tipo = t.ticket_types as unknown as { nome: string } | null;
          return (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {t.titular_nome ?? order?.comprador_nome ?? "Cortesia"}{" "}
                    {t.is_cortesia && <Badge variant="secondary">cortesia</Badge>}
                    {t.intransferivel && <Badge variant="warning">intransferível</Badge>}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    {tipo?.nome} — {order?.comprador_email ?? "—"}
                  </p>
                  <p className="text-xs text-[var(--text-dim)]">{t.codigo_qr}</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[t.status as keyof typeof statusVariant]}>{t.status}</Badge>
                  {t.usado_em && <p className="mt-1 text-xs text-[var(--text-dim)]">{formatDate(t.usado_em)}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!tickets || tickets.length === 0) && <p className="text-[var(--text-muted)]">Nenhum ingresso emitido ainda.</p>}
      </div>
    </div>
  );
}
