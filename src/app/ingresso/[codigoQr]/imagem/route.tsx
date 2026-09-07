import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { getTicketViewData } from "@/lib/ticket-view";
import { formatDate } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ codigoQr: string }> }) {
  const { codigoQr } = await params;
  const view = await getTicketViewData(codigoQr);
  if (!view) return new Response("Ingresso não encontrado.", { status: 404 });

  const { ticket, event, loteNome, compradorNome, produtorNome, codigoFormatado, numeroPedido, qrPayload } = view;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 380, margin: 1 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0e0e16",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "36px 40px",
            background: "linear-gradient(135deg, #7C5CFF 0%, #2A1B66 60%, #FF4D8D 130%)",
          }}
        >
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            {produtorNome.toUpperCase()}
          </span>
          <span style={{ fontSize: 34, color: "#fff", fontWeight: 800 }}>{event?.titulo ?? ""}</span>
          {event && (
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.9)" }}>
              {formatDate(event.data_inicio)} · {event.local}
            </span>
          )}
        </div>

        <div style={{ display: "flex", padding: "28px 40px", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#7a7a8a", fontWeight: 700 }}>TIPO</span>
            <span style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>{loteNome}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#7a7a8a", fontWeight: 700 }}>TITULAR</span>
            <span style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>{compradorNome}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#7a7a8a", fontWeight: 700 }}>PEDIDO</span>
            <span style={{ fontSize: 18, color: "#fff", fontWeight: 700 }}>{numeroPedido}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", background: "#fff", borderRadius: 20, padding: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} width={300} height={300} alt="" />
          </div>
          <span style={{ fontSize: 22, color: "#fff", fontWeight: 800, letterSpacing: 4 }}>{codigoFormatado}</span>
          {ticket.intransferivel && (
            <span style={{ fontSize: 15, color: "#FBBF24", fontWeight: 700 }}>
              Intransferível — exigir documento com foto
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: 800,
      height: 1050,
      headers: {
        "Content-Disposition": `attachment; filename="ingresso-${codigoFormatado}.png"`,
      },
    },
  );
}
