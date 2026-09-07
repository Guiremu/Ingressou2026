import { notFound } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { CheckoutForm, type LoteCarrinho, type FeeTable } from "./checkout-form";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ itens?: string }>;
}) {
  const { eventId } = await params;
  const { itens: itensParam } = await searchParams;

  if (!itensParam) notFound();

  // Comprar exige estar logado — quem não estiver é mandado pro login e volta
  // pra cá (com o carrinho preservado) assim que entrar.
  const profile = await requireLogin(
    `/login?redirect=${encodeURIComponent(`/checkout/${eventId}?itens=${itensParam}`)}`,
  );

  let selecao: { ticketTypeId: string; quantidade: number }[] = [];
  try {
    selecao = JSON.parse(decodeURIComponent(itensParam)).filter((i: { quantidade: number }) => i.quantidade > 0);
  } catch {
    notFound();
  }
  if (selecao.length === 0) notFound();

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, titulo, producer_id, producers(mp_public_key)")
    .eq("id", eventId)
    .eq("status", "publicado")
    .single();

  if (!event) notFound();

  // As três só dependem de `event` já resolvido, não umas das outras — em paralelo.
  const [{ data: ticketTypes }, { data: feeRows }, { data: platformConfig }] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida")
      .eq("event_id", eventId)
      .in(
        "id",
        selecao.map((s) => s.ticketTypeId),
      ),
    supabase.from("mp_fee_table").select("metodo_pagamento, parcelas, taxa_percentual"),
    supabase.from("platform_config").select("taxa_plataforma_percentual").eq("id", true).single(),
  ]);

  if (!ticketTypes || ticketTypes.length !== selecao.length) notFound();

  const lotes: LoteCarrinho[] = selecao.map((s) => {
    const tt = ticketTypes.find((t) => t.id === s.ticketTypeId)!;
    return {
      id: tt.id,
      nome: tt.nome,
      preco: Number(tt.preco),
      quantidadeInicial: s.quantidade,
      restantes: tt.quantidade_total - tt.quantidade_vendida + s.quantidade,
      maxPorPedido: tt.max_por_pedido,
    };
  });

  const feeTable: FeeTable = { pix: {}, credito: {} };
  for (const row of feeRows ?? []) {
    feeTable[row.metodo_pagamento as "pix" | "credito"][row.parcelas] = Number(row.taxa_percentual);
  }

  const mpPublicKey = (event.producers as unknown as { mp_public_key: string | null } | null)?.mp_public_key;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <CheckoutForm
        eventId={event.id}
        eventTitulo={event.titulo}
        lotes={lotes}
        mpPublicKey={mpPublicKey ?? null}
        feeTable={feeTable}
        taxaPlataformaPercentual={Number(platformConfig?.taxa_plataforma_percentual ?? 0.03)}
        comprador={{ nome: profile.nome, email: profile.email, cpf: profile.cpf, telefone: profile.telefone }}
      />
    </div>
  );
}
