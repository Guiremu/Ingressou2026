import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function FinanceiroPage() {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: eventos } = await supabase.from("events").select("id, titulo").eq("producer_id", producer.id);
  const eventIds = (eventos ?? []).map((e) => e.id);

  const { data: orders } = eventIds.length
    ? await supabase
        .from("orders")
        .select(
          "id, comprador_nome, valor_ingressos, valor_total_cobrado, metodo_pagamento, parcelas, status, criado_em, event_id, payment_splits(taxa_mp, taxa_plataforma, valor_liquido_produtor)",
        )
        .in("event_id", eventIds)
        .order("criado_em", { ascending: false })
        .limit(100)
    : { data: [] };

  const eventTitulo = new Map((eventos ?? []).map((e) => [e.id, e.titulo]));

  const totalLiquido = (orders ?? [])
    .filter((o) => o.status === "pago")
    .reduce((acc, o) => {
      const split = (o.payment_splits as unknown as { valor_liquido_produtor: number }[] | null)?.[0];
      return acc + (split ? Number(split.valor_liquido_produtor) : 0);
    }, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Financeiro</h1>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-neutral-500">Saldo líquido acumulado</p>
          <p className="text-3xl font-bold text-neutral-900">{formatCurrency(totalLiquido)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {orders?.map((o) => {
          const split = (o.payment_splits as unknown as { taxa_mp: number; taxa_plataforma: number; valor_liquido_produtor: number }[] | null)?.[0];
          return (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{o.comprador_nome}</p>
                  <p className="text-neutral-500">
                    {eventTitulo.get(o.event_id)} — {formatDate(o.criado_em)}
                  </p>
                  <p className="text-neutral-500">
                    {o.metodo_pagamento} {o.parcelas > 1 ? `${o.parcelas}x` : "à vista"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={o.status === "pago" ? "success" : o.status === "pendente" ? "warning" : "destructive"}>
                    {o.status}
                  </Badge>
                  <p className="mt-1 font-medium text-neutral-900">
                    {formatCurrency(Number(o.valor_total_cobrado))}
                  </p>
                  {split && (
                    <p className="text-xs text-neutral-500">
                      líquido: {formatCurrency(Number(split.valor_liquido_produtor))}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!orders || orders.length === 0) && <p className="text-neutral-500">Nenhuma venda ainda.</p>}
      </div>
    </div>
  );
}
