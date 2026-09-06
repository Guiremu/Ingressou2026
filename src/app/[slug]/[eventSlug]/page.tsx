import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { TicketSelector } from "./ticket-selector";

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
    .select("id, nome, descricao, preco, quantidade_total, quantidade_vendida, max_por_pedido, tipo")
    .eq("event_id", event.id)
    .eq("tipo", "pago")
    .order("preco", { ascending: true });

  const nome = producer.nome_fantasia ?? producer.razao_social;

  const lotes = (ticketTypes ?? []).map((tt) => ({
    id: tt.id,
    nome: tt.nome,
    descricao: tt.descricao,
    preco: Number(tt.preco),
    restantes: tt.quantidade_total - tt.quantidade_vendida,
    maxPorPedido: tt.max_por_pedido,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="relative aspect-[21/9] min-h-[200px] w-full overflow-hidden rounded-[24px] bg-[var(--surface-4)]">
          {event.imagem_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imagem_url} alt={event.titulo} className="h-full w-full object-cover" />
          ) : null}
          <Link
            href={`/${producer.slug}`}
            className="absolute left-3.5 top-3.5 rounded-full bg-[rgba(7,7,11,0.7)] px-3.5 py-2 text-[13px] font-semibold text-white"
          >
            ← Voltar
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-[1.35fr_0.95fr] lg:items-start lg:gap-[26px]">
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div className="flex flex-col gap-[10px]">
              <Link href={`/${producer.slug}`} className="flex items-center gap-2">
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[var(--surface)] font-[var(--font-sora)] text-[11px] font-extrabold text-[var(--accent)]">
                  {nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--purple)]">{nome}</span>
              </Link>
              <h1 className="font-[var(--font-sora)] text-[32px] font-extrabold leading-[1.08] tracking-tight text-white">
                {event.titulo}
              </h1>
              <div className="mt-1 flex flex-wrap gap-2.5">
                <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3.5 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span className="text-[13px] text-[#e6e6f0]">
                    {formatDate(event.data_inicio)}
                    {event.data_fim ? ` até ${formatDate(event.data_fim)}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3.5 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--purple)]" />
                  <span className="text-[13px] text-[#e6e6f0]">
                    {event.local} · {event.cidade}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {event.descricao && (
              <div className="flex flex-col gap-2">
                <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Sobre o evento</h2>
                <p className="max-w-[560px] whitespace-pre-line text-sm leading-relaxed text-[var(--text-muted-2)]">
                  {event.descricao}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Local</h2>
              <div className="flex h-[130px] items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {event.endereco ?? `${event.local}, ${event.cidade}`}
              </div>
            </div>
          </div>

          <TicketSelector eventId={event.id} lotes={lotes} />
        </div>
      </main>
    </div>
  );
}
