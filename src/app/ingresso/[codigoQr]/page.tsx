import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildQrPayload } from "@/lib/qr-payload";
import { buildGoogleWalletSaveUrl } from "@/lib/google-wallet";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { ShareTicketButton } from "@/components/site/share-ticket-button";
import { formatDate } from "@/lib/utils";

export default async function IngressoPage({ params }: { params: Promise<{ codigoQr: string }> }) {
  const { codigoQr } = await params;
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select(
      "id, codigo_qr, assinatura_hmac, status, event_id, order_id, titular_nome, intransferivel, ticket_types(nome), events(titulo, local, endereco, cidade, data_inicio, producers(nome_fantasia, razao_social)), orders(comprador_nome)",
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
    producers: { nome_fantasia: string | null; razao_social: string } | null;
  } | null;
  const loteNome = (ticket.ticket_types as unknown as { nome: string } | null)?.nome ?? "";
  const compradorNome =
    ticket.titular_nome ?? (ticket.orders as unknown as { comprador_nome: string } | null)?.comprador_nome ?? "Cortesia";
  const produtorNome = event?.producers ? (event.producers.nome_fantasia ?? event.producers.razao_social) : "Cortesia";

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
  const numeroPedido = ticket.order_id
    ? `#IGR-${ticket.order_id.replace(/-/g, "").slice(0, 5).toUpperCase()}`
    : "Cortesia";

  const statusInfo = {
    valido: null,
    usado: { texto: "Ingresso já utilizado.", cor: "text-[var(--warning)]" },
    cancelado: { texto: "Ingresso cancelado.", cor: "text-[var(--error)]" },
  }[ticket.status as "valido" | "usado" | "cancelado"];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-3.5 px-4 py-8">
        <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col gap-1.5 bg-[linear-gradient(135deg,#7C5CFF_0%,#2A1B66_60%,#FF4D8D_130%)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">{produtorNome}</p>
            <h1 className="font-[var(--font-sora)] text-[22px] font-extrabold leading-[1.15] tracking-tight text-white">
              {event?.titulo}
            </h1>
            {event && (
              <p className="text-[13px] text-white/88">
                {formatDate(event.data_inicio)} · {event.local}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 p-5">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Tipo</p>
              <p className="text-sm font-semibold text-white">{loteNome}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Titular</p>
              <p className="text-sm font-semibold text-white">{compradorNome}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Local</p>
              <p className="text-sm font-semibold text-white">{event?.cidade}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">Pedido</p>
              <p className="text-sm font-semibold text-white">{numeroPedido}</p>
            </div>
          </div>

          <div className="relative flex h-[22px] items-center">
            <div className="-ml-[11px] h-[22px] w-[22px] rounded-full bg-[#07070b]" />
            <div className="flex-1 border-t-2 border-dashed border-[var(--border-2)]" />
            <div className="-mr-[11px] h-[22px] w-[22px] rounded-full bg-[#07070b]" />
          </div>

          <div className="flex flex-col items-center gap-3.5 px-5 pb-5 pt-2">
            <div className="w-full max-w-[220px] rounded-2xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code do ingresso" className="w-full" />
            </div>
            <p className="font-[var(--font-sora)] text-[15px] font-bold tracking-[0.14em] text-white">
              {codigoFormatado}
            </p>

            {statusInfo ? (
              <div className={`w-full rounded-xl border p-3 text-center text-sm font-semibold ${statusInfo.cor} border-current/30 bg-current/10`}>
                {statusInfo.texto}
              </div>
            ) : (
              <div className="flex w-full items-start gap-2.5 rounded-xl border border-[var(--error)]/35 bg-[var(--error)]/9 p-3">
                <div className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--error)] text-[13px] font-extrabold text-[#2a0a0a]">
                  !
                </div>
                <p className="text-xs leading-relaxed text-[#fca5a5]">
                  <span className="font-bold">Não envie print deste QR.</span> Quem apresentar primeiro na
                  portaria valida a entrada e o código é bloqueado.
                </p>
              </div>
            )}

            {ticket.intransferivel && (
              <div className="flex w-full items-start gap-2.5 rounded-xl border border-[var(--warning)]/35 bg-[var(--warning)]/9 p-3">
                <div className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--warning)] text-[13px] font-extrabold text-[#2a1a00]">
                  !
                </div>
                <p className="text-xs leading-relaxed text-[#fde68a]">
                  <span className="font-bold">Ingresso intransferível.</span> {compradorNome} precisa apresentar um
                  documento com foto na portaria.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <ShareTicketButton eventoTitulo={event?.titulo ?? ""} />
          <p className="px-1.5 text-center text-[11px] leading-relaxed text-[var(--text-dim)]">
            Esse link abre este ingresso sem precisar de login — dá pra mandar pra outra pessoa usar.
          </p>
          {walletUrl && (
            <a
              href={walletUrl}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-[#111214]"
            >
              <span className="h-[18px] w-[18px] rounded-[5px] bg-[linear-gradient(135deg,#4285F4_0%,#34A853_50%,#FBBC05_100%)]" />
              Salvar no Google Wallet
            </a>
          )}
          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-[var(--border-2)] bg-[var(--surface)] px-4 py-3.5 text-sm font-semibold text-[var(--text-dim)]">
            <span className="h-[18px] w-[18px] rounded-[5px] bg-[var(--border-2)]" />
            Apple Wallet · em breve
          </div>
          <Link
            href={event?.cidade ? `/?cidade=${encodeURIComponent(event.cidade)}` : "/"}
            className="p-1.5 text-center text-[13px] text-[var(--text-dim)]"
          >
            Ver outros eventos {event?.cidade ? `em ${event.cidade}` : ""}
          </Link>
        </div>
      </main>
    </div>
  );
}
