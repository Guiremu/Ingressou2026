import Link from "next/link";

/**
 * Mesma estrutura/dimensões do SiteHeader real — só o lado direito (que depende do login)
 * vira barras pulsando — pra não haver salto de layout quando o header de verdade assume.
 */
export function SiteHeaderSkeleton() {
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
        <div className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] md:hidden">
          <span className="h-[2px] w-5 bg-[var(--surface-4)]" />
          <span className="h-[2px] w-5 bg-[var(--surface-4)]" />
          <span className="h-[2px] w-5 bg-[var(--surface-4)]" />
        </div>
        <div className="hidden items-center gap-3.5 md:flex">
          <div className="h-4 w-14 animate-pulse rounded bg-[var(--surface-4)]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-4)]" />
        </div>
      </div>
    </header>
  );
}
