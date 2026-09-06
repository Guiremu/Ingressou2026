import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { CheckoutForm } from "./checkout-form";
import { formatCurrency } from "@/lib/utils";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ lote?: string }>;
}) {
  const { eventId } = await params;
  const { lote } = await searchParams;

  if (!lote) notFound();

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, titulo, producer_id, producers(mp_public_key)")
    .eq("id", eventId)
    .eq("status", "publicado")
    .single();

  if (!event) notFound();

  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida")
    .eq("id", lote)
    .eq("event_id", eventId)
    .single();

  if (!ticketType || ticketType.quantidade_vendida >= ticketType.quantidade_total) notFound();

  const mpPublicKey = (event.producers as unknown as { mp_public_key: string | null } | null)?.mp_public_key;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Finalizar compra</h1>
        <p className="mt-1 text-neutral-500">{event.titulo}</p>
        <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700">
          {ticketType.nome} — {formatCurrency(Number(ticketType.preco))} por unidade
        </p>

        <CheckoutForm
          eventId={event.id}
          ticketTypeId={ticketType.id}
          maxPorPedido={ticketType.max_por_pedido}
          precoUnitario={Number(ticketType.preco)}
          mpPublicKey={mpPublicKey ?? null}
        />
      </main>
    </div>
  );
}
