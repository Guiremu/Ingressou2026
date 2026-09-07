import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { MobileNav } from "@/components/site/mobile-nav";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#07070b]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-[22px] w-[22px] rounded-[7px] bg-[var(--accent)]" />
            <span className="font-[var(--font-sora)] text-lg font-extrabold tracking-tight text-white">
              ingressou
            </span>
          </Link>
          <nav className="hidden gap-5 text-sm text-[var(--text-muted-2)] md:flex">
            <Link href="/" className="font-semibold text-white">
              Eventos
            </Link>
            <Link href="/produtores" className="hover:text-white">
              Produtores
            </Link>
            <Link href="/meus-ingressos" className="hover:text-white">
              Meus ingressos
            </Link>
          </nav>
        </div>
        <MobileNav profile={profile ? { nome: profile.nome, role: profile.role } : null} />
        <div className="hidden items-center gap-3.5 md:flex">
          {profile ? (
            <>
              {(profile.role === "produtor" || profile.role === "colaborador") && (
                <Link href="/produtor" className="text-sm text-[var(--text-muted-2)] hover:text-white">
                  Portal do Produtor
                </Link>
              )}
              {profile.role === "admin" && (
                <Link href="/admin" className="text-sm text-[var(--text-muted-2)] hover:text-white">
                  Gestor ADM
                </Link>
              )}
              <Link href="/perfil" className="text-sm text-[var(--text-muted-2)] hover:text-white">
                {profile.nome.split(" ")[0]}
              </Link>
              <form action="/logout" method="post">
                <button type="submit" className="text-sm text-[var(--text-muted-2)] hover:text-white">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[var(--text-muted-2)] hover:text-white">
                Entrar
              </Link>
              <Link
                href="/cadastro/produtor"
                className="rounded-full bg-[var(--accent)] px-[18px] py-2.5 text-[13px] font-bold text-[var(--accent-foreground)]"
              >
                Sou produtor
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
