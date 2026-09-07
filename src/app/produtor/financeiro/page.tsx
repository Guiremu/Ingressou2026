import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FinanceiroFilters } from "./financeiro-filters";
import { buildOrdersQuery, type FinanceiroFiltros } from "./filtros";

const statusVariant = { pago: "success", pendente: "warning", cancelado: "destructive", estornado: "secondary" } as const;

const formaPagamentoPdvLabel = { dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito", pix: "PIX" } as const;

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<FinanceiroFiltros> }) {
  const { producer } = await requireProducer();
  const filtros = await searchParams;
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("events")
    .select("id, titulo")
    .eq("producer_id", producer.id)
    .order("data_inicio", { ascending: false });
  const eventIds = (eventos ?? []).map((e) => e.id);

  const { data: orders } = eventIds.length
    ? await buildOrdersQuery(supabase, eventIds, filtros).limit(300)
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

  // Gráfico: receita líquida por dia, últimos 14 dias com venda dentro do recorte filtrado.
  const porDia = new Map<string, number>();
  for (const o of pagos) {
    const chave = o.criado_em.slice(0, 10);
    const s = splitDe(o);
    porDia.set(chave, (porDia.get(chave) ?? 0) + (s ? Number(s.valor_liquido_produtor) : 0));
  }
  const diasOrdenados = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const maxBar = Math.max(1, ...diasOrdenados.map(([, v]) => v));

  const queryString = new URLSearchParams(
    Object.entries(filtros).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Financeiro</h1>
        <p className="text-xs text-[#93a0b8]">{pagos.length} pedidos pagos no recorte atual</p>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FinanceiroFilters eventos={eventos ?? []} />
          <Link href={`/produtor/financeiro/export${queryString ? `?${queryString}` : ""}`}>
            <Button variant="outline" size="sm">
              Exportar CSV
            </Button>
          </Link>
        </div>

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

        {diasOrdenados.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
            <span className="text-sm font-bold text-white">Receita líquida por dia</span>
            <div className="flex h-[90px] items-end gap-1.5">
              {diasOrdenados.map(([dia, valor]) => (
                <div
                  key={dia}
                  className="flex-1 rounded-t bg-[var(--accent)]"
                  style={{ height: `${Math.max(4, (valor / maxBar) * 100)}%` }}
                  title={`${formatDate(dia)}: ${formatCurrency(valor)}`}
                />
              ))}
            </div>
          </div>
        )}

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
          <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Pedidos</h2>
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
                      {o.canal === "pdv"
                        ? formaPagamentoPdvLabel[o.forma_pagamento_pdv as keyof typeof formaPagamentoPdvLabel] ?? "PDV"
                        : `${o.metodo_pagamento} ${o.parcelas > 1 ? `${o.parcelas}x` : "à vista"}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{o.canal === "pdv" ? "PDV" : "Site"}</Badge>{" "}
                    <Badge variant={statusVariant[o.status as keyof typeof statusVariant]}>{o.status}</Badge>
                    <p className="mt-1 font-medium text-white">{formatCurrency(Number(o.valor_total_cobrado))}</p>
                    {split && (
                      <div className="mt-0.5 flex flex-col text-xs text-[#93a0b8]">
                        <span>taxa plataforma: {formatCurrency(Number(split.taxa_plataforma))}</span>
                        <span>taxa MP: {formatCurrency(Number(split.taxa_mp))}</span>
                        <span className="font-semibold text-[var(--accent)]">
                          líquido: {formatCurrency(Number(split.valor_liquido_produtor))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!orders || orders.length === 0) && <p className="text-sm text-[#93a0b8]">Nenhum pedido nesse recorte.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
