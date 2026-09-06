import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { AdminNavLink } from "@/components/admin/nav-link";

const navItems = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/produtores", label: "Produtores" },
  { href: "/admin/taxas", label: "Taxas" },
];

const mobileTabs = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/produtores", label: "Produtores" },
  { href: "/admin/taxas", label: "Taxas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  return (
    <div className="flex flex-1 flex-col bg-[#07070b]">
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 md:grid-cols-[224px_1fr]">
        <aside className="hidden flex-col gap-[22px] border-r border-[#263041] bg-[#121722] p-5 md:flex">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-[22px] w-[22px] rounded-[7px] bg-[var(--pink)]" />
            <span className="font-[var(--font-sora)] text-base font-extrabold tracking-tight text-white">
              ingressou
            </span>
            <span className="rounded-md border border-[rgba(255,77,141,0.4)] px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#ff9ec4]">
              ADM
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <AdminNavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-[#18202e] p-2.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#263041] font-[var(--font-sora)] text-xs font-extrabold text-[#ff9ec4]">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#e8ecf5]">Gestor</span>
              <span className="text-[11px] text-[#93a0b8]">Acesso total</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col pb-14 md:pb-0">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between gap-1 border-t border-[#263041] bg-[#0f141d] px-3 py-2.5 md:hidden">
        {mobileTabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="flex-1 py-1.5 text-center text-[11px] text-[#93a0b8]">
            {tab.label}
          </Link>
        ))}
        <form action="/logout" method="post" className="flex-1">
          <button type="submit" className="w-full py-1.5 text-center text-[11px] text-[#93a0b8]">
            Sair
          </button>
        </form>
      </nav>
    </div>
  );
}
