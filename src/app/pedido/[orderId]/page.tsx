import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabel = { valido: "Válido", usado: "Utilizado", cancelado: "Cancelado" } as const;
const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;

export default async function PedidoPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, status, valor_total_cobrado, comprador_nome, events(titulo, imagem_url, data_inicio, cidade)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: tickets } = await admin
    .from("tickets")
    .select("id, codigo_qr, status, ticket_types(nome)")
    .eq("order_id", orderId);

  const event = order.events as unknown as {
    titulo: string;
    imagem_url: string | null;
    data_inicio: string;
    cidade: string | null;
  } | null;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[#0e0e16]">
          <div className="relative flex flex-col gap-1.5 overflow-hidden bg-[linear-gradient(135deg,#7C5CFF_0%,#2A1B66_60%,#FF4D8D_130%)] p-5">
            {event?.imagem_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imagem_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-overlay"
              />
            )}
            <p className="relative text-[10px] font-bold uppercase tracking-wider text-white/85">
              Pedido de {order.comprador_nome}
            </p>
            <h1 className="relative font-[var(--font-sora)] text-[21px] font-extrabold leading-[1.15] tracking-tight text-white">
              {event?.titulo ?? "Evento"}
            </h1>
            {event && (
              <p className="relative text-[13px] text-white/88">
                {formatDate(event.data_inicio)} · {event.cidade}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-5 pb-3.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Total pago</p>
              <p className="font-[var(--font-sora)] text-xl font-bold text-[var(--accent)]">
                {formatCurrency(Number(order.valor_total_cobrado))}
              </p>
            </div>
            <Badge variant={order.status === "pago" ? "success" : order.status === "pendente" ? "warning" : "destructive"}>
              {order.status === "pago" ? "Pago" : order.status === "pendente" ? "Aguardando pagamento" : "Cancelado"}
            </Badge>
          </div>

          {order.status === "pendente" && (
            <p className="mx-5 mb-4 rounded-xl bg-[var(--warning)]/10 p-3.5 text-sm text-[var(--warning)]">
              Pagamento ainda não confirmado. Atualize esta página após pagar.
            </p>
          )}

          {order.status === "cancelado" && (
            <p className="mx-5 mb-4 rounded-xl bg-[var(--error)]/10 p-3.5 text-sm text-[var(--error)]">
              Este pedido foi cancelado.
            </p>
          )}

          {tickets && tickets.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)] p-5">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {tickets.length} {tickets.length === 1 ? "ingresso" : "ingressos"}
              </p>
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/ingresso/${t.codigo_qr}`}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--border-2)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]/40"
                >
                  <p className="text-sm font-semibold text-white">
                    {(t.ticket_types as unknown as { nome: string } | null)?.nome}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <Badge variant={statusVariant[t.status as keyof typeof statusVariant]}>
                      {statusLabel[t.status as keyof typeof statusLabel]}
                    </Badge>
                    <span className="text-[var(--accent)]">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-[var(--border)] p-5 pt-4">
            <Link
              href="/meus-ingressos"
              className="flex items-center justify-center rounded-[14px] border border-[var(--border-2)] px-4 py-3 text-sm font-semibold text-white"
            >
              Ver todos os meus ingressos
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
