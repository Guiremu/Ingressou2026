import Link from "next/link";
import { anoAtual } from "@/lib/utils";

const links = [
  { href: "/sobre", label: "Sobre" },
  { href: "/suporte", label: "Suporte" },
  { href: "/termos", label: "Termos de uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/regras", label: "Regras de compra" },
  { href: "/direitos-autorais", label: "Direitos autorais" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-sm sm:flex-row sm:justify-between">
        <span className="font-[var(--font-sora)] font-bold text-white">ingressou</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[var(--text-muted)]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/direitos-autorais" className="text-xs text-[var(--text-dim)] hover:text-white">
          © {anoAtual()} ingressou
        </Link>
      </div>
    </footer>
  );
}
