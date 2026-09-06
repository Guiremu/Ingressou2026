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
    <div className="flex flex-1 flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/produtor" className="text-xl font-bold tracking-tight text-neutral-900">
            ingressou <span className="font-normal text-neutral-400">produtor</span>
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {producer.status === "pendente" && (
          <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Seu cadastro está <Badge variant="warning">pendente</Badge> de aprovação do Gestor ADM.
            Você já pode criar eventos como rascunho, mas não poderá publicá-los nem receber
            pagamentos até ser aprovado.
          </div>
        )}
        {producer.status === "bloqueado" && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            Sua conta está <Badge variant="destructive">bloqueada</Badge>. Entre em contato com o
            suporte da plataforma.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
