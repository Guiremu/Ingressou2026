import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { getTicketViewData } from "@/lib/ticket-view";
import { formatDate } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ codigoQr: string }> }) {
  const { codigoQr } = await params;
  const view = await getTicketViewData(codigoQr);
  if (!view) return NextResponse.json({ error: "Ingresso não encontrado." }, { status: 404 });

  const { ticket, event, loteNome, compradorNome, produtorNome, codigoFormatado, numeroPedido, qrPayload } = view;

  const qrPng = await QRCode.toBuffer(qrPayload, { width: 400, margin: 1 });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([320, 520]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const roxo = rgb(0.29, 0.11, 0.4);
  const branco = rgb(1, 1, 1);
  const cinza = rgb(0.4, 0.42, 0.48);
  const preto = rgb(0.06, 0.06, 0.07);

  page.drawRectangle({ x: 0, y: 440, width: 320, height: 80, color: roxo });
  page.drawText(produtorNome.toUpperCase(), { x: 20, y: 495, size: 8, font: bold, color: branco });
  page.drawText(event?.titulo ?? "", { x: 20, y: 475, size: 14, font: bold, color: branco, maxWidth: 280 });
  if (event) {
    page.drawText(`${formatDate(event.data_inicio)} - ${event.local ?? ""}`, {
      x: 20,
      y: 458,
      size: 9,
      font: regular,
      color: branco,
    });
  }

  let y = 415;
  const linha = (rotulo: string, valor: string) => {
    page.drawText(rotulo.toUpperCase(), { x: 20, y, size: 7, font: bold, color: cinza });
    page.drawText(valor, { x: 20, y: y - 12, size: 11, font: regular, color: preto, maxWidth: 280 });
    y -= 34;
  };

  linha("Tipo", loteNome);
  linha("Titular", compradorNome);
  linha("Local", event?.cidade ?? "");
  linha("Pedido", numeroPedido);

  const qrImage = await pdfDoc.embedPng(qrPng);
  const qrSize = 180;
  page.drawImage(qrImage, { x: (320 - qrSize) / 2, y: 90, width: qrSize, height: qrSize });
  page.drawText(codigoFormatado, {
    x: (320 - bold.widthOfTextAtSize(codigoFormatado, 12)) / 2,
    y: 70,
    size: 12,
    font: bold,
    color: preto,
  });

  const aviso = ticket.intransferivel
    ? `Ingresso intransferível — ${compradorNome} deve apresentar documento com foto.`
    : "Não compartilhe este QR. Quem apresentar primeiro na portaria valida a entrada.";
  page.drawText(aviso, { x: 20, y: 40, size: 7, font: regular, color: cinza, maxWidth: 280, lineHeight: 10 });

  const bytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ingresso-${codigoFormatado}.pdf"`,
    },
  });
}
