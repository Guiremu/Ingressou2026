import "server-only";
import jwt from "jsonwebtoken";

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

export function isGoogleWalletConfigured() {
  return Boolean(ISSUER_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}

/**
 * Monta o link "Salvar no Google Wallet" (Generic Pass) para um ingresso.
 * Requer uma classe de Generic Pass já criada no Google Wallet Console com id
 * `${ISSUER_ID}.ingressou_ticket_class` — ver README para o passo a passo de configuração.
 */
export function buildGoogleWalletSaveUrl(ticket: {
  id: string;
  codigoQr: string;
  eventoTitulo: string;
  local: string | null;
  dataInicio: string;
  compradorNome: string;
  loteNome: string;
}): string | null {
  if (!isGoogleWalletConfigured()) return null;

  const classId = `${ISSUER_ID}.ingressou_ticket_class`;
  const objectId = `${ISSUER_ID}.ingresso_${ticket.id}`;

  const genericObject = {
    id: objectId,
    classId,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    hexBackgroundColor: "#171717",
    cardTitle: { defaultValue: { language: "pt-BR", value: "Ingressou" } },
    subheader: { defaultValue: { language: "pt-BR", value: ticket.loteNome } },
    header: { defaultValue: { language: "pt-BR", value: ticket.eventoTitulo } },
    textModulesData: [
      { header: "Titular", body: ticket.compradorNome },
      { header: "Local", body: ticket.local ?? "" },
    ],
    barcode: { type: "QR_CODE", value: ticket.codigoQr },
    validTimeInterval: {
      startTime: ticket.dataInicio,
    },
  };

  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    origins: [process.env.NEXT_PUBLIC_SITE_URL ?? ""],
    payload: { genericObjects: [genericObject] },
  };

  const token = jwt.sign(claims, PRIVATE_KEY!, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
