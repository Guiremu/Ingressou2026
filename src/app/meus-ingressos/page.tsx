import Link from "next/link";
import { requireLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusLabel = { usado: "Utilizado", cancelado: "Cancelado" } as const;
const statusVariant = { usado: "secondary", cancelado: "destructive" } as const;

const pedidoStatusVariant = { pendente: "warning", cancelado: "destructive", estornado: "secondary" } as const;
const pedidoStatusLabel = { pendente: "Aguardando pagamento", cancelado: "Cancelado", estornado: "Estornado" } as const;

interface EventoResumo {
  titulo: string;
  imagem_url: string | null;
  data_inicio: string;
  cidade: string | null;
}

export default async function MeusIngressosPage() {
  const profile = await requireLogin();
  const supabase = await createClient();

  const [{ data: ticketsVinculados }, { data: ticketsDoPedido }, { data: pedidosProblema }] = await Promise.all([
    // Ingressos vinculados direto à conta: cortesia por CPF ou já transferidos.
    supabase
      .from("tickets")
      .select("id, codigo_qr, status, criado_em, ticket_types(nome), events(titulo, imagem_url, data_inicio, cidade)")
      .eq("profile_id", profile.id)
      .order("criado_em", { ascending: false }),
    // Ingressos comprados por esta conta e ainda não transferidos (profile_id nulo).
    supabase
      .from("tickets")
      .select(
        "id, codigo_qr, status, criado_em, ticket_types(nome), events(titulo, imagem_url, data_inicio, cidade), orders!inner(profile_id)",
      )
      .is("profile_id", null)
      .eq("orders.profile_id", profile.id)
      .order("criado_em", { ascending: false }),
    // Pedidos sem ingresso gerado ainda (pendente) ou que não vingaram — pra não sumir do radar.
    supabase
      .from("orders")
      .select("id, status, criado_em, events(titulo)")
      .eq("profile_id", profile.id)
      .neq("status", "pago")
      .order("criado_em", { ascending: false }),
  ]);

  const ingressos = [...(ticketsVinculados ?? []), ...(ticketsDoPedido ?? [])].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">
          Meus ingressos
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">Toque em um ingresso pra abrir o QR de entrada.</p>

        <div className="mt-6 flex flex-col gap-3">
          {ingressos.length === 0 && (!pedidosProblema || pedidosProblema.length === 0) && (
            <p className="mt-10 text-center text-[var(--text-muted)]">Você ainda não tem nenhum ingresso.</p>
          )}

          {ingressos.map((t) => {
            const event = t.events as unknown as EventoResumo | null;
            const tipo = (t.ticket_types as unknown as { nome: string } | null)?.nome;
            const status = t.status as "valido" | "usado" | "cancelado";

            return (
              <Link key={t.id} href={`/ingresso/${t.codigo_qr}`}>
                <Card className="transition hover:border-[var(--accent)]/40">
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
                      {tipo && <p className="text-xs text-[var(--text-dim)]">{tipo}</p>}
                    </div>
                    {status !== "valido" && (
                      <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {pedidosProblema && pedidosProblema.length > 0 && (
            <>
              <h2 className="mt-4 font-[var(--font-sora)] text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Outros pedidos
              </h2>
              {pedidosProblema.map((o) => {
                const event = o.events as unknown as { titulo: string } | null;
                const status = o.status as "pendente" | "cancelado" | "estornado";
                return (
                  <Link key={o.id} href={`/pedido/${o.id}`}>
                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="truncate font-semibold text-white">{event?.titulo ?? "Evento"}</p>
                          <p className="text-xs text-[var(--text-muted)]">{formatDate(o.criado_em)}</p>
                        </div>
                        <Badge variant={pedidoStatusVariant[status]}>{pedidoStatusLabel[status]}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
