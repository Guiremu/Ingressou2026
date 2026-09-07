import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusVariant = { pago: "success", pendente: "warning", cancelado: "destructive", estornado: "secondary" } as const;

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
  const pagos = (orders ?? []).filter((o) => o.status === "pago");

  const splitDe = (o: (typeof pagos)[number]) =>
    (o.payment_splits as unknown as { taxa_mp: number; taxa_plataforma: number; valor_liquido_produtor: number }[] | null)?.[0];

  const totalBruto = pagos.reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
  const totalTaxas = pagos.reduce((acc, o) => {
    const s = splitDe(o);
    return acc + (s ? Number(s.taxa_mp) + Number(s.taxa_plataforma) : 0);
  }, 0);
  const totalLiquido = pagos.reduce((acc, o) => acc + (splitDe(o)?.valor_liquido_produtor ? Number(splitDe(o)!.valor_liquido_produtor) : 0), 0);

  const porEvento = new Map<string, number>();
  for (const o of pagos) {
    const s = splitDe(o);
    porEvento.set(o.event_id, (porEvento.get(o.event_id) ?? 0) + (s ? Number(s.valor_liquido_produtor) : 0));
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Financeiro</h1>
        <p className="text-xs text-[#93a0b8]">{pagos.length} pedidos pagos · todos os seus eventos</p>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="flex flex-wrap overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
          {[
            { label: "Vendido (bruto)", valor: formatCurrency(totalBruto) },
            { label: "Taxas descontadas", valor: formatCurrency(totalTaxas), cor: "text-[var(--pink)]" },
            { label: "Saldo líquido a receber", valor: formatCurrency(totalLiquido), cor: "text-[var(--accent)]" },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              className={`flex flex-1 flex-col gap-1 p-3.5 ${i < arr.length - 1 ? "border-r border-[#263041]" : ""}`}
              style={{ minWidth: 160 }}
            >
              <span className="text-xs text-[#93a0b8]">{stat.label}</span>
              <span className={`font-[var(--font-sora)] text-[21px] font-bold ${stat.cor ?? "text-white"}`}>
                {stat.valor}
              </span>
            </div>
          ))}
        </div>

        {porEvento.size > 0 && (
          <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
            <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Repasses por evento</h2>
            <div className="flex flex-col gap-2">
              {[...porEvento.entries()].map(([eventId, valor]) => (
                <div
                  key={eventId}
                  className="flex items-center justify-between rounded-[14px] border border-[#263041] bg-[#18202e] px-3.5 py-3"
                >
                  <span className="text-sm font-semibold text-white">{eventTitulo.get(eventId) ?? "Evento"}</span>
                  <span className="font-[var(--font-sora)] text-sm font-bold text-[var(--accent)]">
                    {formatCurrency(valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
          <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Últimos pedidos</h2>
          <div className="flex flex-col gap-2.5">
            {orders?.map((o) => {
              const split = splitDe(o);
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{o.comprador_nome}</p>
                    <p className="text-[#93a0b8]">
                      {eventTitulo.get(o.event_id)} — {formatDate(o.criado_em)}
                    </p>
                    <p className="text-[#5d6b84]">
                      {o.metodo_pagamento} {o.parcelas > 1 ? `${o.parcelas}x` : "à vista"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant[o.status as keyof typeof statusVariant]}>{o.status}</Badge>
                    <p className="mt-1 font-medium text-white">{formatCurrency(Number(o.valor_total_cobrado))}</p>
                    {split && (
                      <p className="text-xs text-[#93a0b8]">líquido: {formatCurrency(Number(split.valor_liquido_produtor))}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {(!orders || orders.length === 0) && <p className="text-sm text-[#93a0b8]">Nenhuma venda ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
