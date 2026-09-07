import Link from "next/link";
import { requireLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusVariant = { pendente: "warning", pago: "success", cancelado: "destructive", estornado: "secondary" } as const;

export default async function MeusIngressosPage() {
  const profile = await requireLogin();
  const supabase = await createClient();

  const [{ data: orders }, { data: cortesias }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, valor_total_cobrado, criado_em, events(titulo, imagem_url, data_inicio, cidade), tickets(id, codigo_qr, status)",
      )
      .eq("profile_id", profile.id)
      .order("criado_em", { ascending: false }),
    // Cortesias vinculadas direto por CPF não passam por um pedido — vêm à parte.
    supabase
      .from("tickets")
      .select("id, codigo_qr, status, criado_em, events(titulo, imagem_url, data_inicio, cidade)")
      .eq("profile_id", profile.id)
      .is("order_id", null)
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">
          Meus ingressos
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">Pedidos feitos com a sua conta.</p>

        <div className="mt-6 flex flex-col gap-3">
          {(!orders || orders.length === 0) && (!cortesias || cortesias.length === 0) && (
            <p className="mt-10 text-center text-[var(--text-muted)]">Você ainda não tem nenhum ingresso.</p>
          )}

          {orders?.map((order) => {
            const event = order.events as unknown as {
              titulo: string;
              imagem_url: string | null;
              data_inicio: string;
              cidade: string | null;
            } | null;
            const tickets = (order.tickets as unknown as { id: string; codigo_qr: string; status: string }[]) ?? [];

            return (
              <Card key={order.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="h-16 w-16 flex-none overflow-hidden rounded-xl bg-[var(--surface-4)]">
                    {event?.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.imagem_url} alt={event.titulo} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate font-semibold text-white">{event?.titulo ?? "Evento"}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {event ? `${formatDate(event.data_inicio)} · ${event.cidade}` : ""}
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {tickets.length} {tickets.length === 1 ? "ingresso" : "ingressos"} ·{" "}
                      {formatCurrency(Number(order.valor_total_cobrado))}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    <Badge variant={statusVariant[order.status as keyof typeof statusVariant]}>{order.status}</Badge>
                    <Link href={`/pedido/${order.id}`} className="text-xs font-semibold text-[var(--accent)]">
                      Ver pedido
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {cortesias && cortesias.length > 0 && (
            <>
              <h2 className="mt-4 font-[var(--font-sora)] text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Cortesias recebidas
              </h2>
              {cortesias.map((c) => {
                const event = c.events as unknown as {
                  titulo: string;
                  imagem_url: string | null;
                  data_inicio: string;
                  cidade: string | null;
                } | null;
                return (
                  <Card key={c.id}>
                    <CardContent className="flex flex-wrap items-center gap-4 p-4">
                      <div className="h-16 w-16 flex-none overflow-hidden rounded-xl bg-[var(--surface-4)]">
                        {event?.imagem_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={event.imagem_url} alt={event.titulo} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate font-semibold text-white">{event?.titulo ?? "Evento"}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {event ? `${formatDate(event.data_inicio)} · ${event.cidade}` : ""}
                        </p>
                        <Badge variant="secondary">cortesia</Badge>
                      </div>
                      <Link href={`/ingresso/${c.codigo_qr}`} className="text-xs font-semibold text-[var(--accent)]">
                        Ver ingresso
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
