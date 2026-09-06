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
    <div className="flex flex-1 flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="text-xl font-bold tracking-tight text-neutral-900">
            ingressou <span className="font-normal text-neutral-400">gestor</span>
          </Link>
          <form action="/logout" method="post">
            <button type="submit" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
              Sair
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
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
