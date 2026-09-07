import { NextResponse } from "next/server";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { buildOrdersQuery, type FinanceiroFiltros } from "../filtros";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: Request) {
  const { producer } = await requireProducer();
  const supabase = await createClient();
  const url = new URL(request.url);

  const filtros: FinanceiroFiltros = {
    evento: url.searchParams.get("evento") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    de: url.searchParams.get("de") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
  };

  const { data: eventos } = await supabase.from("events").select("id, titulo").eq("producer_id", producer.id);
  const eventIds = (eventos ?? []).map((e) => e.id);
  const eventTitulo = new Map((eventos ?? []).map((e) => [e.id, e.titulo]));

  const { data: orders } = eventIds.length ? await buildOrdersQuery(supabase, eventIds, filtros).limit(5000) : { data: [] };

  const header = [
    "evento",
    "comprador",
    "criado_em",
    "metodo_pagamento",
    "parcelas",
    "status",
    "valor_ingressos",
    "valor_total_cobrado",
    "taxa_plataforma",
    "taxa_mp",
    "valor_liquido_produtor",
  ];
  const lines = [header.join(";")];

  for (const o of orders ?? []) {
    const split = (o.payment_splits as unknown as { taxa_mp: number; taxa_plataforma: number; valor_liquido_produtor: number }[] | null)?.[0];
    lines.push(
      [
        eventTitulo.get(o.event_id) ?? "",
        o.comprador_nome,
        o.criado_em,
        o.metodo_pagamento,
        o.parcelas,
        o.status,
        o.valor_ingressos,
        o.valor_total_cobrado,
        split?.taxa_plataforma ?? "",
        split?.taxa_mp ?? "",
        split?.valor_liquido_produtor ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(";"),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro.csv"`,
    },
  });
}
