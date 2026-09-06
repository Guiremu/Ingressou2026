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
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <Link href="/produtor/eventos/novo">
          <Button>Novo evento</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500">Vendido (bruto)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">
            {formatCurrency(totalVendido)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500">Seu saldo líquido</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">
            {formatCurrency(saldoLiquido)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-500">Ingressos vendidos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{ingressosVendidos}</CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Seus eventos</h2>
        <div className="flex flex-col gap-3">
          {(!events || events.length === 0) && (
            <p className="text-neutral-500">Você ainda não criou nenhum evento.</p>
          )}
          {events?.map((event) => (
            <Link key={event.id} href={`/produtor/eventos/${event.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{event.titulo}</p>
                    <p className="text-sm text-neutral-500">{formatDate(event.data_inicio)}</p>
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
