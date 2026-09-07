import { NextResponse } from "next/server";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("id, titulo, producer_id").eq("id", id).single();
  if (!event || event.producer_id !== producer.id) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "codigo_qr, status, titular_nome, titular_cpf, intransferivel, criado_em, usado_em, ticket_types(nome), orders(comprador_nome, comprador_email, comprador_cpf)",
    )
    .eq("event_id", id)
    .eq("is_cortesia", false)
    .order("criado_em", { ascending: true });

  const header = [
    "codigo",
    "titular",
    "email",
    "cpf",
    "lote",
    "status",
    "intransferivel",
    "criado_em",
    "usado_em",
  ];
  const lines = [header.join(";")];

  for (const t of tickets ?? []) {
    const order = t.orders as unknown as { comprador_nome: string; comprador_email: string; comprador_cpf: string } | null;
    const tipo = t.ticket_types as unknown as { nome: string } | null;
    lines.push(
      [
        t.codigo_qr,
        t.titular_nome ?? order?.comprador_nome ?? "",
        order?.comprador_email ?? "",
        t.titular_cpf ?? order?.comprador_cpf ?? "",
        tipo?.nome ?? "",
        t.status,
        t.intransferivel ? "sim" : "não",
        t.criado_em,
        t.usado_em ?? "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(";"),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ingressos-${event.titulo.replace(/\s+/g, "-")}.csv"`,
    },
  });
}
