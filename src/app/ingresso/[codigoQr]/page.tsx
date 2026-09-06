import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildQrPayload } from "@/lib/qr-payload";
import { buildGoogleWalletSaveUrl } from "@/lib/google-wallet";
import { SiteHeader } from "@/components/site/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusLabel = { valido: "Válido", usado: "Já utilizado", cancelado: "Cancelado" } as const;
const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;

export default async function IngressoPage({ params }: { params: Promise<{ codigoQr: string }> }) {
  const { codigoQr } = await params;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select(
      "id, codigo_qr, assinatura_hmac, status, event_id, ticket_types(nome), events(titulo, local, endereco, cidade, data_inicio), orders(comprador_nome)",
    )
    .eq("codigo_qr", codigoQr)
    .maybeSingle();

  if (!ticket) notFound();

  const event = ticket.events as unknown as {
    titulo: string;
    local: string | null;
    endereco: string | null;
    cidade: string | null;
    data_inicio: string;
  } | null;
  const loteNome = (ticket.ticket_types as unknown as { nome: string } | null)?.nome ?? "";
  const compradorNome = (ticket.orders as unknown as { comprador_nome: string } | null)?.comprador_nome ?? "Cortesia";

  const qrDataUrl = await QRCode.toDataURL(
    buildQrPayload({ codigo_qr: ticket.codigo_qr, assinatura_hmac: ticket.assinatura_hmac, event_id: ticket.event_id }),
    { width: 320, margin: 1 },
  );

  const walletUrl = event
    ? buildGoogleWalletSaveUrl({
        id: ticket.id,
        codigoQr: ticket.codigo_qr,
        eventoTitulo: event.titulo,
        local: event.local,
        dataInicio: event.data_inicio,
        compradorNome,
        loteNome,
      })
    : null;

  const codigoCurto = ticket.codigo_qr.replace(/-/g, "").slice(0, 8).toUpperCase();
  const codigoFormatado = `${codigoCurto.slice(0, 4)}-${codigoCurto.slice(4)}`;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Badge variant={statusVariant[ticket.status as keyof typeof statusVariant]}>
              {statusLabel[ticket.status as keyof typeof statusLabel]}
            </Badge>
            <h1 className="font-[var(--font-sora)] text-xl font-extrabold tracking-tight text-white">
              {event?.titulo}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">{loteNome}</p>
            {event && (
              <p className="text-sm text-[var(--text-muted)]">
                {formatDate(event.data_inicio)} — {event.local}, {event.cidade}
              </p>
            )}
            <p className="text-sm text-[var(--text-muted)]">Titular: {compradorNome}</p>

            <p className="font-[var(--font-sora)] text-[15px] font-bold tracking-[0.14em] text-white">
              {codigoFormatado}
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code do ingresso" className="h-64 w-64 rounded-xl bg-white p-2" />

            {walletUrl && (
              <a
                href={walletUrl}
                className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-bold text-white"
              >
                Salvar no Google Wallet
              </a>
            )}

            <div className="mt-2 rounded-xl bg-[var(--warning)]/10 p-3 text-left text-xs text-[var(--warning)]">
              <strong>Proteja seu ingresso:</strong> não compartilhe este link nem prints do QR Code
              com outras pessoas. Quem apresentar o QR Code primeiro na portaria valida o acesso —
              o ingresso não pode ser usado duas vezes.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
