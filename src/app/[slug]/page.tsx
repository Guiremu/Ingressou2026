import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";
import { EventCard } from "@/components/site/event-card";

export default async function ProducerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: producer } = await supabase
    .from("producers")
    .select("id, slug, nome_fantasia, razao_social, logo_url, status")
    .eq("slug", slug)
    .eq("status", "aprovado")
    .maybeSingle();

  if (!producer) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("titulo, imagem_url, categoria, cidade, data_inicio, slug")
    .eq("producer_id", producer.id)
    .eq("status", "publicado")
    .order("data_inicio", { ascending: true });

  const nome = producer.nome_fantasia ?? producer.razao_social;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex items-center gap-4">
          {producer.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producer.logo_url} alt={nome} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xl font-bold text-neutral-500">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{nome}</h1>
            <p className="text-neutral-500">Eventos deste produtor</p>
          </div>
        </div>

        {!events || events.length === 0 ? (
          <p className="mt-16 text-center text-neutral-500">Nenhum evento publicado no momento.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.slug}
                event={{
                  titulo: event.titulo,
                  imagem_url: event.imagem_url,
                  categoria: event.categoria,
                  cidade: event.cidade,
                  data_inicio: event.data_inicio,
                  producerSlug: producer.slug,
                  eventSlug: event.slug,
                  producerNome: nome,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
