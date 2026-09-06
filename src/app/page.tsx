import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { EventCard } from "@/components/site/event-card";
import { EventFilters } from "@/components/site/event-filters";

interface EventListRow {
  id: string;
  titulo: string;
  imagem_url: string | null;
  categoria: string | null;
  cidade: string | null;
  data_inicio: string;
  slug: string;
  producers: { slug: string; nome_fantasia: string | null; razao_social: string } | null;
}

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cidade?: string; categoria?: string }>;
}) {
  const { q, cidade, categoria } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, titulo, imagem_url, categoria, cidade, data_inicio, slug, producers(slug, nome_fantasia, razao_social)")
    .eq("status", "publicado")
    .order("data_inicio", { ascending: true });

  if (q) query = query.ilike("titulo", `%${q}%`);
  if (cidade) query = query.eq("cidade", cidade);
  if (categoria) query = query.eq("categoria", categoria);

  const { data: events } = await query;
  const rows = (events ?? []) as unknown as EventListRow[];

  const { data: precos } = rows.length
    ? await supabase
        .from("ticket_types")
        .select("event_id, preco")
        .in(
          "event_id",
          rows.map((r) => r.id),
        )
        .eq("tipo", "pago")
    : { data: [] };

  const precoMinimoPorEvento = new Map<string, number>();
  for (const p of precos ?? []) {
    const atual = precoMinimoPorEvento.get(p.event_id);
    if (atual === undefined || Number(p.preco) < atual) precoMinimoPorEvento.set(p.event_id, Number(p.preco));
  }

  const { data: cidadesData } = await supabase
    .from("events")
    .select("cidade")
    .eq("status", "publicado")
    .not("cidade", "is", null);
  const { data: categoriasData } = await supabase
    .from("events")
    .select("categoria")
    .eq("status", "publicado")
    .not("categoria", "is", null);

  const cidades = [...new Set((cidadesData ?? []).map((e) => e.cidade as string))].sort();
  const categorias = [...new Set((categoriasData ?? []).map((e) => e.categoria as string))].sort();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Ariquemes · RO</p>
        <h1 className="mt-2 font-[var(--font-sora)] text-[34px] font-extrabold leading-[1.05] tracking-tight text-white">
          O que rola
          <br />
          na cidade
        </h1>

        <div className="mt-6">
          <EventFilters categorias={categorias} cidades={cidades} />
        </div>

        {rows.length === 0 ? (
          <p className="mt-16 text-center text-[var(--text-muted)]">Nenhum evento encontrado.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((event) =>
              event.producers ? (
                <EventCard
                  key={`${event.producers.slug}-${event.slug}`}
                  event={{
                    titulo: event.titulo,
                    imagem_url: event.imagem_url,
                    categoria: event.categoria,
                    cidade: event.cidade,
                    data_inicio: event.data_inicio,
                    precoMinimo: precoMinimoPorEvento.get(event.id) ?? null,
                    producerSlug: event.producers.slug,
                    eventSlug: event.slug,
                    producerNome: event.producers.nome_fantasia ?? event.producers.razao_social,
                  }}
                />
              ) : null,
            )}
          </div>
        )}
      </main>
    </div>
  );
}
