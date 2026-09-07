import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, diasAtrasISO } from "@/lib/utils";

const eventStatusVariant = {
  rascunho: "secondary",
  publicado: "success",
  encerrado: "secondary",
  cancelado: "destructive",
} as const;

const quickActions = [
  { label: "Validar QR Code", href: "/produtor/eventos", tint: "bg-[var(--accent)]/14 border-[var(--accent)]/30" },
  { label: "Gerar cortesia", href: "/produtor/eventos", tint: "bg-[var(--purple)]/16 border-[var(--purple)]/34" },
  { label: "Lista de ingressos", href: "/produtor/eventos", tint: "bg-white/10 border-[#2e3a4e]" },
];

export default async function ProdutorDashboard() {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, titulo, local, status, data_inicio, slug")
    .eq("producer_id", producer.id)
    .order("criado_em", { ascending: false })
    .limit(10);

  const eventosAtivos = (events ?? []).filter((e) => e.status === "publicado").length;

  const trintaDiasAtras = diasAtrasISO(30);
  const eventIds = (events ?? []).map((e) => e.id);

  // orders e capacidade só dependem de eventIds — em paralelo.
  const [{ data: orders }, { data: capacidade }] = await Promise.all([
    eventIds.length
      ? supabase
          .from("orders")
          .select("id, event_id, valor_ingressos, criado_em")
          .in("event_id", eventIds)
          .eq("status", "pago")
          .gte("criado_em", trintaDiasAtras)
      : Promise.resolve({ data: [] as { id: string; event_id: string; valor_ingressos: number; criado_em: string }[] }),
    eventIds.length
      ? supabase.from("ticket_types").select("quantidade_total").in("event_id", eventIds).eq("tipo", "pago")
      : Promise.resolve({ data: [] as { quantidade_total: number }[] }),
  ]);

  const orderIds = (orders ?? []).map((o) => o.id);

  // items e splits só dependem de orderIds — em paralelo.
  const [{ data: items }, { data: splits }] = await Promise.all([
    orderIds.length
      ? supabase.from("order_items").select("order_id, quantidade").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; quantidade: number }[] }),
    orderIds.length
      ? supabase.from("payment_splits").select("valor_liquido_produtor").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { valor_liquido_produtor: number }[] }),
  ]);

  const qtdPorOrder = new Map<string, number>();
  for (const item of items ?? []) {
    qtdPorOrder.set(item.order_id, (qtdPorOrder.get(item.order_id) ?? 0) + item.quantidade);
  }

  const vendasNoPeriodo = (orders ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
  const ingressosVendidos = [...qtdPorOrder.values()].reduce((a, b) => a + b, 0);
  const saldoAReceber = (splits ?? []).reduce((acc, s) => acc + Number(s.valor_liquido_produtor), 0);
  const capacidadeTotal = (capacidade ?? []).reduce((acc, c) => acc + c.quantidade_total, 0);
  const conversao = capacidadeTotal > 0 ? (ingressosVendidos / capacidadeTotal) * 100 : 0;

  const vendasPorEvento = new Map<string, { vendidos: number; receita: number }>();
  for (const o of orders ?? []) {
    const atual = vendasPorEvento.get(o.event_id) ?? { vendidos: 0, receita: 0 };
    atual.vendidos += qtdPorOrder.get(o.id) ?? 0;
    atual.receita += Number(o.valor_ingressos);
    vendasPorEvento.set(o.event_id, atual);
  }

  const dias = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const vendasPorDia = dias.map((d) => {
    const chave = d.toDateString();
    const total = (orders ?? [])
      .filter((o) => new Date(o.criado_em).toDateString() === chave)
      .reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
    return { dia: d.getDate(), total };
  });
  const maxBar = Math.max(1, ...vendasPorDia.map((v) => v.total));

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Visão geral</h1>
          <p className="text-xs text-[#93a0b8]">
            Últimos 30 dias · {eventosAtivos} {eventosAtivos === 1 ? "evento ativo" : "eventos ativos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[10px] border border-[#263041] bg-[#18202e] px-3.5 py-2 text-[13px] text-[#c7d0e0]">
            30 dias
          </span>
          <Link
            href="/produtor/eventos/novo"
            className="rounded-[10px] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-bold text-[#0b0e14]"
          >
            + Criar evento
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-2.5 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5"
            >
              <div className={`h-8 w-8 flex-none rounded-[10px] border ${a.tint}`} />
              <span className="text-sm font-semibold text-[#e8ecf5]">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
          {[
            { label: "Vendas no período", valor: formatCurrency(vendasNoPeriodo), cor: "text-white" },
            { label: "Ingressos vendidos", valor: String(ingressosVendidos), cor: "text-white" },
            { label: "Saldo a receber", valor: formatCurrency(saldoAReceber), cor: "text-[var(--accent)]" },
            { label: "Conversão", valor: `${conversao.toFixed(1).replace(".", ",")}%`, cor: "text-white" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-1 flex-col gap-1 p-3.5 ${i < 3 ? "border-r border-[#263041]" : ""}`}
              style={{ minWidth: 160 }}
            >
              <span className="text-xs text-[#93a0b8]">{stat.label}</span>
              <span className={`font-[var(--font-sora)] text-[21px] font-bold ${stat.cor}`}>{stat.valor}</span>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
          <div className="flex items-center justify-between gap-3 border-b border-[#263041] p-3.5">
            <span className="text-sm font-bold text-white">Meus eventos</span>
            <span className="text-xs text-[#93a0b8]">{events?.length ?? 0} registros</span>
          </div>
          <div className="hidden grid-cols-[2.2fr_0.9fr_0.8fr_1fr_1fr_0.7fr] gap-2.5 border-b border-[#263041] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5d6b84] md:grid">
            <span>Evento</span>
            <span>Data</span>
            <span>Status</span>
            <span>Vendidos</span>
            <span>Receita</span>
            <span />
          </div>
          {(events ?? []).map((event) => {
            const stats = vendasPorEvento.get(event.id);
            return (
              <div
                key={event.id}
                className="flex flex-wrap items-center gap-2 border-b border-[#1c2532] px-4 py-3 last:border-b-0 md:grid md:grid-cols-[2.2fr_0.9fr_0.8fr_1fr_1fr_0.7fr] md:gap-2.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-white">{event.titulo}</span>
                  <span className="text-xs text-[#5d6b84]">{event.local}</span>
                </div>
                <span className="text-[13px] text-[#c7d0e0]">{formatDate(event.data_inicio).split(" ")[0]}</span>
                <span>
                  <Badge variant={eventStatusVariant[event.status as keyof typeof eventStatusVariant]}>
                    {event.status}
                  </Badge>
                </span>
                <span className="text-[13px] text-[#c7d0e0]">{stats?.vendidos ?? "—"}</span>
                <span className="text-[13px] font-semibold text-white">
                  {stats ? formatCurrency(stats.receita) : "—"}
                </span>
                <Link href={`/produtor/eventos/${event.id}`} className="text-[13px] font-semibold text-[var(--accent)]">
                  Gerir
                </Link>
              </div>
            );
          })}
          {(!events || events.length === 0) && (
            <p className="p-4 text-sm text-[var(--text-muted)]">Você ainda não criou nenhum evento.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#263041] bg-[#121722] p-4">
          <span className="text-sm font-bold text-white">Vendas por dia</span>
          <div className="flex h-[90px] items-end gap-1.5">
            {vendasPorDia.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${i >= 12 ? "bg-[var(--accent)]" : "bg-[#3d4a63]"}`}
                style={{ height: `${Math.max(4, (v.total / maxBar) * 100)}%` }}
                title={`Dia ${v.dia}: ${formatCurrency(v.total)}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
