import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
}) {
  const { slug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: producer } = await supabase
    .from("producers")
    .select("id, slug, nome_fantasia, razao_social")
    .eq("slug", slug)
    .eq("status", "aprovado")
    .maybeSingle();

  if (!producer) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, titulo, descricao, categoria, imagem_url, local, endereco, cidade, data_inicio, data_fim, slug")
    .eq("producer_id", producer.id)
    .eq("slug", eventSlug)
    .eq("status", "publicado")
    .maybeSingle();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, nome, preco, quantidade_total, quantidade_vendida, tipo, data_inicio_venda, data_fim_venda")
    .eq("event_id", event.id)
    .eq("tipo", "pago")
    .order("preco", { ascending: true });

  const nome = producer.nome_fantasia ?? producer.razao_social;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-200">
          {event.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imagem_url} alt={event.titulo} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {event.categoria && <Badge variant="secondary">{event.categoria}</Badge>}
          <h1 className="text-3xl font-bold text-neutral-900">{event.titulo}</h1>
          <p className="text-neutral-500">
            {formatDate(event.data_inicio)}
            {event.data_fim ? ` até ${formatDate(event.data_fim)}` : ""}
          </p>
          <p className="text-neutral-500">
            {event.local} — {event.endereco}, {event.cidade}
          </p>
          <Link
            href={`/${producer.slug}`}
            className="text-sm font-medium text-neutral-700 underline"
          >
            por {nome}
          </Link>
        </div>

        {event.descricao && (
          <p className="mt-6 whitespace-pre-line text-neutral-700">{event.descricao}</p>
        )}

        <h2 className="mt-10 text-xl font-bold text-neutral-900">Ingressos</h2>
        <div className="mt-4 flex flex-col gap-3">
          {!ticketTypes || ticketTypes.length === 0 ? (
            <p className="text-neutral-500">Nenhum lote disponível no momento.</p>
          ) : (
            ticketTypes.map((tt) => {
              const esgotado = tt.quantidade_vendida >= tt.quantidade_total;
              return (
                <Card key={tt.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{tt.nome}</p>
                      <p className="text-sm text-neutral-500">{formatCurrency(Number(tt.preco))}</p>
                    </div>
                    <Link href={`/checkout/${event.id}?lote=${tt.id}`}>
                      <Button disabled={esgotado} variant={esgotado ? "outline" : "default"}>
                        {esgotado ? "Esgotado" : "Comprar"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
