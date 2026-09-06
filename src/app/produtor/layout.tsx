import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/produtor", label: "Dashboard" },
  { href: "/produtor/eventos", label: "Eventos" },
  { href: "/produtor/financeiro", label: "Financeiro" },
  { href: "/produtor/conta", label: "Conta / Mercado Pago" },
];

export default async function ProdutorLayout({ children }: { children: React.ReactNode }) {
  const { producer } = await requireProducer();

  return (
    <div className="flex flex-1 flex-col bg-[#07070b]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[#07070b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/produtor"
            className="font-[var(--font-sora)] text-base font-extrabold tracking-tight text-white"
          >
            ingressou <span className="font-medium text-[var(--text-dim)]">produtor</span>
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {producer.status === "pendente" && (
          <div className="mb-6 rounded-xl bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
            Seu cadastro está <Badge variant="warning">pendente</Badge> de aprovação do Gestor ADM.
            Você já pode criar eventos como rascunho, mas não poderá publicá-los nem receber
            pagamentos até ser aprovado.
          </div>
        )}
        {producer.status === "bloqueado" && (
          <div className="mb-6 rounded-xl bg-[var(--pink)]/10 p-4 text-sm text-[var(--pink)]">
            Sua conta está <Badge variant="destructive">bloqueada</Badge>. Entre em contato com o
            suporte da plataforma.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
