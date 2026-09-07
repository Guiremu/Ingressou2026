import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTicketViewData } from "@/lib/ticket-view";
import { verifyPrintToken } from "@/lib/tickets";
import { formatDate } from "@/lib/utils";
import { registrarImpressao } from "./actions";
import { ImprimirAoAbrir } from "./imprimir-ao-abrir";

export default async function ImprimirIngressoPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigoQr: string }>;
  searchParams: Promise<{ pt?: string; confirmar?: string }>;
}) {
  const { codigoQr } = await params;
  const { pt, confirmar } = await searchParams;

  if (!verifyPrintToken(codigoQr, pt)) {
    return (
      <Mensagem titulo="Link de impressão expirado">
        Volte à tela de venda no PDV e clique em imprimir de novo.
      </Mensagem>
    );
  }

  const view = await getTicketViewData(codigoQr);
  if (!view) notFound();

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("canal").eq("id", view.ticket.order_id).maybeSingle();
  if (!order || order.canal !== "pdv") {
    return <Mensagem titulo="Ingresso não é de uma venda do PDV">Essa rota é só pra ingressos vendidos no PDV.</Mensagem>;
  }

  const confirmando = confirmar === "1";

  if (!confirmando && view.ticket.impresso_count > 0) {
    return <ConfirmarReimpressao codigoQr={codigoQr} pt={pt!} ultimaImpressaoEm={view.ticket.ultima_impressao_em} />;
  }

  const registro = confirmando
    ? await registrarImpressao(codigoQr, true)
    : await registrarImpressao(codigoQr, false);

  if (registro.jaImpresso) {
    return <ConfirmarReimpressao codigoQr={codigoQr} pt={pt!} ultimaImpressaoEm={null} />;
  }

  const qrDataUrl = await QRCode.toDataURL(view.qrPayload, { width: 220, margin: 1 });

  return (
    <div className="flex min-h-screen justify-center bg-[#e8e8e8] py-6 print:bg-white print:py-0">
      <style>{`@page { size: 80mm auto; margin: 4mm; }`}</style>
      <ImprimirAoAbrir />
      <div className="w-[80mm] bg-white p-3 text-black print:w-full">
        <div className="flex flex-col items-center gap-1 border-b border-dashed border-black pb-2 text-center">
          <p className="text-[10px] font-bold uppercase">{view.produtorNome}</p>
          <p className="text-sm font-extrabold leading-tight">{view.event?.titulo}</p>
          {view.event && (
            <p className="text-[10px]">
              {formatDate(view.event.data_inicio)} · {view.event.local}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 py-2 text-[11px]">
          <Linha label="Tipo" valor={view.loteNome} />
          <Linha label="Titular" valor={view.compradorNome} />
          <Linha label="Pedido" valor={view.numeroPedido} />
          <Linha label="Emitido por" valor={view.lojaEmissora ?? "—"} />
        </div>

        <div className="flex flex-col items-center gap-1.5 border-t border-dashed border-black pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code do ingresso" className="h-[180px] w-[180px]" />
          <p className="font-mono text-[11px] font-bold tracking-widest">{view.codigoFormatado}</p>
          <p className="text-center text-[9px] leading-tight">
            Não compartilhe este QR. Quem apresentar primeiro na portaria valida a entrada.
          </p>
        </div>
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-bold uppercase">{label}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

function Mensagem({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#07070b] px-4 py-16 text-center">
      <div>
        <p className="font-[var(--font-sora)] text-lg font-bold text-white">{titulo}</p>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">{children}</p>
      </div>
    </div>
  );
}

function ConfirmarReimpressao({
  codigoQr,
  pt,
  ultimaImpressaoEm,
}: {
  codigoQr: string;
  pt: string;
  ultimaImpressaoEm: string | null;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#07070b] px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-5 text-center">
        <p className="font-[var(--font-sora)] text-base font-bold text-[var(--warning)]">
          Este ingresso já foi impresso
        </p>
        <p className="mt-2 text-sm text-[#fde68a]">
          {ultimaImpressaoEm ? `Última impressão em ${formatDate(ultimaImpressaoEm)}. ` : ""}
          Reimprimir pode gerar uma via extra em circulação — confirme só se a primeira impressão
          falhou (ex.: acabou o papel).
        </p>
        <a
          href={`/pdv/imprimir/${codigoQr}?pt=${pt}&confirmar=1`}
          className="mt-4 inline-block rounded-full bg-[var(--warning)] px-5 py-2.5 text-sm font-bold text-[#2a1a00]"
        >
          Confirmar reimpressão
        </a>
      </div>
    </div>
  );
}
