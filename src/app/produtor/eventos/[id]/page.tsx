import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { LoteForm } from "./lote-form";
import { CortesiaForm } from "./cortesia-form";
import { ValidatorForm } from "./validator-form";
import { ValidatorToggle } from "./validator-toggle";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event || event.producer_id !== producer.id) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", id)
    .order("criado_em", { ascending: true });

  const { data: validators } = await supabase
    .from("validators")
    .select("*")
    .eq("event_id", id)
    .order("criado_em", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.titulo}</h1>
          <p className="text-[var(--text-muted)]">
            {formatDate(event.data_inicio)} — {event.cidade}
          </p>
          <Badge variant="secondary" className="mt-2">
            {event.status}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusActions eventId={event.id} status={event.status} />
          <Link
            href={`/produtor/eventos/${event.id}/checkin`}
            className="text-sm font-medium text-[var(--text-muted-2)] underline"
          >
            Abrir check-in (câmera)
          </Link>
          <Link
            href={`/produtor/eventos/${event.id}/ingressos`}
            className="text-sm font-medium text-[var(--text-muted-2)] underline"
          >
            Ver / exportar ingressos
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes de ingresso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ticketTypes
            ?.filter((tt) => tt.tipo === "pago")
            .map((tt) => (
              <div
                key={tt.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
              >
                <div>
                  <p className="font-medium text-white">{tt.nome}</p>
                  <p className="text-sm text-[var(--text-muted)]">{formatCurrency(Number(tt.preco))}</p>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {tt.quantidade_vendida} / {tt.quantidade_total} vendidos
                </p>
              </div>
            ))}
          <LoteForm eventId={event.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingressos cortesia</CardTitle>
        </CardHeader>
        <CardContent>
          <CortesiaForm eventId={event.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colaboradores de portaria</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {validators?.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3"
            >
              <div>
                <p className="font-medium text-white">{v.nome_identificacao}</p>
                <p className="break-all text-xs text-[var(--text-muted)]">
                  {siteUrl}/validar/{event.slug}?token={v.token_publico}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={v.ativo ? "success" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
                <ValidatorToggle id={v.id} ativo={v.ativo} />
              </div>
            </div>
          ))}
          <ValidatorForm eventId={event.id} />
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" disabled>
          Editar dados do evento (em breve)
        </Button>
      </div>
    </div>
  );
}
