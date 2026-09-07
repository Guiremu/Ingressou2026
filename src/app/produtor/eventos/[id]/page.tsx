import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { LoteForm } from "./lote-form";
import { LoteRow } from "./lote-row";
import { CortesiaForm } from "./cortesia-form";
import { ValidatorForm } from "./validator-form";
import { ValidatorToggle } from "./validator-toggle";
import { EventEditForm } from "./event-edit-form";
import { ExcluirEventoButton } from "./excluir-evento-button";
import type { EventRow, Ticket, TicketType } from "@/types/database";

const motivoLabel = { funcionario: "Funcionário", amigo: "Amigo", patrocinador: "Patrocinador", outro: "Outro" };

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event || event.producer_id !== producer.id) notFound();

  const [{ data: ticketTypes }, { data: validators }, { data: cortesias }] = await Promise.all([
    supabase.from("ticket_types").select("*").eq("event_id", id).order("ordem", { ascending: true }),
    supabase.from("validators").select("*").eq("event_id", id).order("criado_em", { ascending: false }),
    supabase
      .from("tickets")
      .select("*")
      .eq("event_id", id)
      .eq("is_cortesia", true)
      .order("criado_em", { ascending: false }),
  ]);

  const lotesPagos = (ticketTypes ?? []).filter((tt): tt is TicketType => tt.tipo === "pago");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
          {event.status === "publicado" && (
            <Link
              href={`/${producer.slug}/${event.slug}`}
              target="_blank"
              className="text-sm font-medium text-[var(--text-muted-2)] underline"
            >
              Ver página pública ↗
            </Link>
          )}
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
          <CardTitle>Dados do evento</CardTitle>
        </CardHeader>
        <CardContent>
          <EventEditForm event={event} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lotes de ingresso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lotesPagos.map((tt, i) => (
            <LoteRow key={tt.id} lote={tt} isFirst={i === 0} isLast={i === lotesPagos.length - 1} />
          ))}
          <LoteForm eventId={event.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingressos cortesia</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CortesiaForm eventId={event.id} />
          {cortesias && cortesias.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {cortesias.length} gerada(s)
              </p>
              {(cortesias as Ticket[]).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">
                      {c.titular_nome ?? "Sem nome definido"}{" "}
                      {c.intransferivel && <Badge variant="warning">intransferível</Badge>}
                    </p>
                    <p className="text-[var(--text-muted)]">
                      {motivoLabel[c.motivo_cortesia ?? "outro"]}
                      {c.titular_cpf && ` · CPF ${c.titular_cpf}`}
                    </p>
                  </div>
                  <Badge variant={c.status === "usado" ? "secondary" : c.status === "cancelado" ? "destructive" : "success"}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
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

      {event.status === "rascunho" && (
        <div>
          <ExcluirEventoButton eventId={event.id} />
        </div>
      )}
    </div>
  );
}
