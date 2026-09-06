import { createClient } from "@/lib/supabase/server";
import { formatCurrency, diasAtrasISO } from "@/lib/utils";
import { ProducerActions } from "./producer-actions";

const statusPillCor = { pendente: "#FBBF24", aprovado: "#34D399", bloqueado: "#F87171" } as const;

export default async function ProdutoresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  const { data: producers } = await supabase
    .from("producers")
    .select("id, razao_social, nome_fantasia, slug, status, criado_em")
    .order("criado_em", { ascending: false });

  const contagem = {
    pendente: producers?.filter((p) => p.status === "pendente").length ?? 0,
    aprovado: producers?.filter((p) => p.status === "aprovado").length ?? 0,
    bloqueado: producers?.filter((p) => p.status === "bloqueado").length ?? 0,
  };

  const filtrados = status ? (producers ?? []).filter((p) => p.status === status) : (producers ?? []);

  const producerIds = (producers ?? []).map((p) => p.id);
  const { data: events } = producerIds.length
    ? await supabase.from("events").select("id, producer_id").in("producer_id", producerIds)
    : { data: [] };
  const eventosPorProdutor = new Map<string, string[]>();
  for (const e of events ?? []) {
    eventosPorProdutor.set(e.producer_id, [...(eventosPorProdutor.get(e.producer_id) ?? []), e.id]);
  }

  const trintaDiasAtras = diasAtrasISO(30);
  const todosEventIds = (events ?? []).map((e) => e.id);
  const { data: orders } = todosEventIds.length
    ? await supabase
        .from("orders")
        .select("event_id, valor_ingressos")
        .in("event_id", todosEventIds)
        .eq("status", "pago")
        .gte("criado_em", trintaDiasAtras)
    : { data: [] };

  const vendasPorEvento = new Map<string, number>();
  for (const o of orders ?? []) {
    vendasPorEvento.set(o.event_id, (vendasPorEvento.get(o.event_id) ?? 0) + Number(o.valor_ingressos));
  }

  const filtros = [
    { key: "pendente", label: `Pendentes ${contagem.pendente}` },
    { key: "aprovado", label: `Aprovados ${contagem.aprovado}` },
    { key: "bloqueado", label: `Bloqueados ${contagem.bloqueado}` },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Produtores</h1>
        <div className="flex flex-wrap gap-2">
          <a
            href="?"
            className={`rounded-full px-3 py-1.5 text-xs ${!status ? "bg-[#18202e] text-[#c7d0e0]" : "text-[#93a0b8]"}`}
          >
            Todos {producers?.length ?? 0}
          </a>
          {filtros.map((f) => (
            <a
              key={f.key}
              href={`?status=${f.key}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                status === f.key
                  ? "bg-[var(--pink)] text-[#0b0e14]"
                  : "border border-[#263041] bg-[#18202e] text-[#c7d0e0]"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1.1fr_1.4fr] gap-2.5 border-b border-[#263041] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5d6b84] md:grid">
            <span>Produtor</span>
            <span>Status</span>
            <span>Eventos</span>
            <span>Vendas 30d</span>
            <span>Ações</span>
          </div>
          {filtrados.map((p) => {
            const nome = p.nome_fantasia ?? p.razao_social;
            const sigla = nome
              .split(" ")
              .slice(0, 2)
              .map((w: string) => w.charAt(0).toUpperCase())
              .join("");
            const eventIds = eventosPorProdutor.get(p.id) ?? [];
            const vendas30d = eventIds.reduce((acc, id) => acc + (vendasPorEvento.get(id) ?? 0), 0);

            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 border-b border-[#1c2532] px-4 py-3.5 last:border-b-0 md:grid md:grid-cols-[2fr_1fr_1fr_1.1fr_1.4fr]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#263041] font-[var(--font-sora)] text-[11px] font-extrabold text-[#c7d0e0]">
                    {sigla}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-white">{nome}</span>
                    <span className="truncate text-xs text-[#5d6b84]">/{p.slug}</span>
                  </div>
                </div>
                <span>
                  <span
                    className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      color: statusPillCor[p.status as keyof typeof statusPillCor],
                      background: `${statusPillCor[p.status as keyof typeof statusPillCor]}1f`,
                    }}
                  >
                    {p.status}
                  </span>
                </span>
                <span className="text-[13px] text-[#c7d0e0]">{eventIds.length}</span>
                <span className="text-[13px] font-semibold text-white">
                  {vendas30d > 0 ? formatCurrency(vendas30d) : "—"}
                </span>
                <ProducerActions id={p.id} status={p.status} />
              </div>
            );
          })}
          {filtrados.length === 0 && <p className="p-4 text-sm text-[var(--text-muted)]">Nenhum produtor encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
