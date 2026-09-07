import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { Badge } from "@/components/ui/badge";
import { ProdutorNavLink } from "@/components/produtor/nav-link";

const navItems = [
  { href: "/produtor", label: "Visão geral" },
  { href: "/produtor/eventos", label: "Meus eventos" },
  { href: "/produtor/financeiro", label: "Financeiro" },
  { href: "/produtor/conta", label: "Configurações" },
];

const mobileTabs = [
  { href: "/produtor", label: "Visão geral" },
  { href: "/produtor/eventos", label: "Eventos" },
  { href: "/produtor/financeiro", label: "Financeiro" },
  { href: "/produtor/conta", label: "Config." },
];

export default async function ProdutorLayout({ children }: { children: React.ReactNode }) {
  const { producer } = await requireProducer();
  const nome = producer.nome_fantasia ?? producer.razao_social;

  return (
    <div className="flex flex-1 flex-col bg-[#07070b]">
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 md:grid-cols-[224px_1fr]">
        <aside className="hidden flex-col gap-[22px] border-r border-[#263041] bg-[#121722] p-5 md:flex">
          <Link href="/produtor" className="flex items-center gap-2.5">
            <div className="h-[22px] w-[22px] rounded-[7px] bg-[var(--accent)]" />
            <span className="font-[var(--font-sora)] text-base font-extrabold tracking-tight text-white">
              ingressou
            </span>
            <span className="rounded-md border border-[#2e3a4e] px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#93a0b8]">
              Produtor
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <ProdutorNavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-[#18202e] p-2.5">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#263041] font-[var(--font-sora)] text-xs font-extrabold text-[var(--accent)]">
              {nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#e8ecf5]">{nome}</span>
              <span className="text-[11px] text-[#93a0b8]">
                {producer.status === "aprovado" ? "Aprovado" : producer.status === "pendente" ? "Pendente" : "Bloqueado"}
              </span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col pb-14 md:pb-0">
          {producer.status !== "aprovado" && (
            <div className="px-5 pt-4">
              {producer.status === "pendente" && (
                <div className="rounded-xl bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
                  Seu cadastro está <Badge variant="warning">pendente</Badge> de aprovação do Gestor ADM.
                </div>
              )}
              {producer.status === "bloqueado" && (
                <div className="rounded-xl bg-[var(--pink)]/10 p-4 text-sm text-[var(--pink)]">
                  Sua conta está <Badge variant="destructive">bloqueada</Badge>. Entre em contato com o suporte.
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between gap-0.5 border-t border-[#263041] bg-[#0f141d] px-1.5 py-2.5 md:hidden">
        {mobileTabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="flex-1 py-1.5 text-center text-[10px] leading-tight text-[#93a0b8]">
            {tab.label}
          </Link>
        ))}
        <form action="/logout" method="post" className="flex-1">
          <button type="submit" className="w-full py-1.5 text-center text-[10px] leading-tight text-[#93a0b8]">
            Sair
          </button>
        </form>
      </nav>
    </div>
  );
}
