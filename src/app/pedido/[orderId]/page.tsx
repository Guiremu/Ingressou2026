import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const statusLabel = { valido: "Válido", usado: "Utilizado", cancelado: "Cancelado" } as const;
const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;

export default async function PedidoPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, valor_total_cobrado, comprador_nome, events(titulo)")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: tickets } = await admin
    .from("tickets")
    .select("id, codigo_qr, status, ticket_types(nome)")
    .eq("order_id", orderId);

  const eventTitulo = (order.events as unknown as { titulo: string } | null)?.titulo;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">
          Pedido de {order.comprador_nome}
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">{eventTitulo}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Total: <span className="font-bold text-[var(--accent)]">{formatCurrency(Number(order.valor_total_cobrado))}</span>
        </p>

        {order.status === "pendente" && (
          <p className="mt-6 rounded-xl bg-[var(--warning)]/10 p-4 text-sm text-[var(--warning)]">
            Pagamento ainda não confirmado. Atualize esta página após pagar.
          </p>
        )}

        {order.status === "cancelado" && (
          <p className="mt-6 rounded-xl bg-[var(--error)]/10 p-4 text-sm text-[var(--error)]">
            Este pedido foi cancelado.
          </p>
        )}

        {tickets && tickets.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-white">
                      {(t.ticket_types as unknown as { nome: string } | null)?.nome}
                    </p>
                    <Badge variant={statusVariant[t.status as keyof typeof statusVariant]}>
                      {statusLabel[t.status as keyof typeof statusLabel]}
                    </Badge>
                  </div>
                  <Link href={`/ingresso/${t.codigo_qr}`} className="font-medium text-[var(--accent)] underline">
                    Ver ingresso
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
