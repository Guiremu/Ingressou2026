import Link from "next/link";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/produtores", label: "Produtores" },
  { href: "/admin/taxas", label: "Taxas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-1 flex-col bg-[#07070b]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#07070b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/admin"
            className="font-[var(--font-sora)] text-base font-extrabold tracking-tight text-white"
          >
            ingressou <span className="font-medium text-[var(--text-dim)]">gestor</span>
          </Link>
          <form action="/logout" method="post">
            <button type="submit" className="text-sm font-medium text-[var(--text-muted)] hover:text-white">
              Sair
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
