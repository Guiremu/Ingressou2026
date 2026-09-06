import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site/site-header";

export default async function ProdutoresPage() {
  const supabase = await createClient();

  const { data: producers } = await supabase
    .from("producers")
    .select("slug, nome_fantasia, razao_social, logo_url")
    .eq("status", "aprovado")
    .order("razao_social", { ascending: true });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">Produtores</h1>
        <p className="mt-1 text-[var(--text-muted)]">Organizadores de eventos na plataforma.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {producers?.map((p) => {
            const nome = p.nome_fantasia ?? p.razao_social;
            return (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-2)]"
              >
                {p.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo_url} alt={nome} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-3)] font-[var(--font-sora)] text-lg font-extrabold text-[var(--accent)]">
                    {nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-white">{nome}</span>
              </Link>
            );
          })}
          {(!producers || producers.length === 0) && (
            <p className="text-[var(--text-muted)]">Nenhum produtor aprovado ainda.</p>
          )}
        </div>
      </main>
    </div>
  );
}
