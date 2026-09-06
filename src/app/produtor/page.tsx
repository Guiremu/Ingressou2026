import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const eventStatusVariant = {
  rascunho: "secondary",
  publicado: "success",
  encerrado: "secondary",
  cancelado: "destructive",
} as const;

export default async function ProdutorDashboard() {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, titulo, status, data_inicio, slug")
    .eq("producer_id", producer.id)
    .order("criado_em", { ascending: false })
    .limit(10);

  const { data: allEvents } = await supabase.from("events").select("id").eq("producer_id", producer.id);
  const allEventIds = (allEvents ?? []).map((e) => e.id);

  let totalVendido = 0;
  let saldoLiquido = 0;
  let ingressosVendidos = 0;

  if (allEventIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("valor_ingressos, quantidade, id")
      .in("event_id", allEventIds)
      .eq("status", "pago");

    totalVendido = (orders ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
    ingressosVendidos = (orders ?? []).reduce((acc, o) => acc + o.quantidade, 0);

    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: splits } = await supabase
        .from("payment_splits")
        .select("valor_liquido_produtor")
        .in("order_id", orderIds);
      saldoLiquido = (splits ?? []).reduce((acc, s) => acc + Number(s.valor_liquido_produtor), 0);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">
            Visão geral
          </h1>
          <p className="text-xs text-[var(--text-muted)]">{producer.nome_fantasia ?? producer.razao_social}</p>
        </div>
        <Link href="/produtor/eventos/novo">
          <Button>Novo evento</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Vendido (bruto)
            </CardTitle>
          </CardHeader>
          <CardContent className="font-[var(--font-sora)] text-[21px] font-bold text-white">
            {formatCurrency(totalVendido)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Seu saldo líquido
            </CardTitle>
          </CardHeader>
          <CardContent className="font-[var(--font-sora)] text-[21px] font-bold text-[var(--accent)]">
            {formatCurrency(saldoLiquido)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Ingressos vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="font-[var(--font-sora)] text-[21px] font-bold text-white">
            {ingressosVendidos}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-[var(--font-sora)] text-base font-bold text-white">Seus eventos</h2>
        <div className="flex flex-col gap-3">
          {(!events || events.length === 0) && (
            <p className="text-[var(--text-muted)]">Você ainda não criou nenhum evento.</p>
          )}
          {events?.map((event) => (
            <Link key={event.id} href={`/produtor/eventos/${event.id}`}>
              <Card className="transition-colors hover:border-[var(--border-2)]">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-white">{event.titulo}</p>
                    <p className="text-sm text-[var(--text-muted)]">{formatDate(event.data_inicio)}</p>
                  </div>
                  <Badge variant={eventStatusVariant[event.status as keyof typeof eventStatusVariant]}>
                    {event.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
