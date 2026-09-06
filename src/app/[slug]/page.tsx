import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { EventCard } from "@/components/site/event-card";

export default async function ProducerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { slug } = await params;
  const { aba } = await searchParams;
  const abaAtiva = aba === "encerrados" || aba === "sobre" ? aba : "proximos";
  const supabase = await createClient();

  const { data: producer } = await supabase
    .from("producers")
    .select("id, slug, nome_fantasia, razao_social, logo_url, banner_url, descricao, cidade, criado_em")
    .eq("slug", slug)
    .eq("status", "aprovado")
    .maybeSingle();

  if (!producer) notFound();

  const nome = producer.nome_fantasia ?? producer.razao_social;

  const { count: encerradosCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("producer_id", producer.id)
    .eq("status", "encerrado");

  const statusFiltro = abaAtiva === "encerrados" ? "encerrado" : "publicado";

  const { data: events } =
    abaAtiva === "sobre"
      ? { data: [] }
      : await supabase
          .from("events")
          .select("id, titulo, imagem_url, categoria, cidade, data_inicio, slug")
          .eq("producer_id", producer.id)
          .eq("status", statusFiltro)
          .order("data_inicio", { ascending: abaAtiva === "proximos" });

  const { count: proximosCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("producer_id", producer.id)
    .eq("status", "publicado");

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: precos } = eventIds.length
    ? await supabase.from("ticket_types").select("event_id, preco").in("event_id", eventIds).eq("tipo", "pago")
    : { data: [] };
  const precoMinimoPorEvento = new Map<string, number>();
  for (const p of precos ?? []) {
    const atual = precoMinimoPorEvento.get(p.event_id);
    if (atual === undefined || Number(p.preco) < atual) precoMinimoPorEvento.set(p.event_id, Number(p.preco));
  }

  const tabs = [
    { key: "proximos", label: `Próximos eventos ${proximosCount ?? 0}` },
    { key: "encerrados", label: "Encerrados" },
    { key: "sobre", label: "Sobre" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8">
        <div className="relative h-[168px] w-full overflow-hidden rounded-b-[24px] bg-[linear-gradient(120deg,#2A1B66_0%,#7C5CFF_60%,#FF4D8D_120%)]">
          {producer.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producer.banner_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="-mt-[34px] flex flex-wrap items-end justify-between gap-4 px-1">
          <div className="flex items-end gap-4">
            {producer.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={producer.logo_url}
                alt={nome}
                className="h-[84px] w-[84px] rounded-[20px] border-2 border-[#0e0e16] object-cover"
              />
            ) : (
              <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[20px] border-2 border-[#0e0e16] bg-[var(--surface)] font-[var(--font-sora)] text-[26px] font-extrabold text-[var(--accent)]">
                {nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">{nome}</h1>
                <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Verificado
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-muted-2)]">
                {producer.cidade ?? "—"} · {(encerradosCount ?? 0) + (proximosCount ?? 0)} eventos realizados
              </p>
            </div>
          </div>
          <button className="self-center rounded-full bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-[var(--accent-foreground)]">
            Seguir produtor
          </button>
        </div>

        {producer.descricao && (
          <p className="mt-4 max-w-[620px] px-1 text-sm leading-relaxed text-[var(--text-muted-2)]">
            {producer.descricao}
          </p>
        )}

        <div className="mt-3.5 flex gap-5 border-b border-[var(--border)] px-1">
          {tabs.map((tab) => (
            <a
              key={tab.key}
              href={`?aba=${tab.key}`}
              className={`pb-3 text-sm ${
                abaAtiva === tab.key
                  ? "font-bold text-white shadow-[inset_0_-2px_0_var(--accent)]"
                  : "text-[var(--text-muted-2)]"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {abaAtiva === "sobre" ? (
          <p className="mt-6 max-w-[620px] px-1 text-sm leading-relaxed text-[var(--text-muted-2)]">
            {producer.descricao ?? "Este produtor ainda não adicionou uma descrição."}
          </p>
        ) : !events || events.length === 0 ? (
          <p className="mt-16 text-center text-[var(--text-muted)]">Nenhum evento aqui no momento.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-[18px] px-1 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.slug}
                event={{
                  titulo: event.titulo,
                  imagem_url: event.imagem_url,
                  categoria: event.categoria,
                  cidade: event.cidade,
                  data_inicio: event.data_inicio,
                  precoMinimo: precoMinimoPorEvento.get(event.id) ?? null,
                  producerSlug: producer.slug,
                  eventSlug: event.slug,
                  producerNome: nome,
                  mostrarProdutor: false,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
