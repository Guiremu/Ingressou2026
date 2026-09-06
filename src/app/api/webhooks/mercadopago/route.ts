import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { finalizePaidOrder, markOrderFailed } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Valida o header x-signature conforme o algoritmo do Mercado Pago:
 * HMAC-SHA256("id:{data.id};request-id:{x-request-id};ts:{ts};", secret) deve bater com o v1
 * enviado. Sem isso, qualquer um poderia forjar um POST pra esse endpoint — mesmo o webhook
 * nunca confiando cegamente no corpo da notificação (sempre confirmamos consultando a API do MP),
 * a assinatura barra essas tentativas antes de gastar uma chamada à API.
 */
function assinaturaValida(request: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado, não há o que validar (dev local)

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  let ts = "";
  let hash = "";
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key === "ts") ts = value;
    if (key === "v1") hash = value;
  }
  if (!ts || !hash) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(esperado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook do Mercado Pago (payment.updated). O MP notifica por query string
 * (?type=payment&data.id=123) ou por corpo JSON, dependendo da configuração — tratamos ambos.
 * Sempre respondemos 200 rapidamente (mesmo em erro de negócio) para evitar reentrega agressiva do MP;
 * apenas falhas de leitura da notificação retornam erro.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (!paymentId) {
    try {
      const body = await request.json();
      paymentId = body?.data?.id ?? null;
    } catch {
      // corpo vazio/ inválido — segue com paymentId nulo
    }
  }

  if (!paymentId || (topic && topic !== "payment")) {
    return NextResponse.json({ received: true });
  }

  if (!assinaturaValida(request, paymentId)) {
    console.error("Webhook do Mercado Pago: assinatura inválida, ignorando notificação.");
    return NextResponse.json({ received: true });
  }

  try {
    const payment = await getPayment(paymentId);
    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ received: true });

    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();
    if (!order) return NextResponse.json({ received: true });

    if (payment.status === "approved") {
      await finalizePaidOrder(orderId, String(payment.id));
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await markOrderFailed(orderId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Erro ao processar webhook do Mercado Pago:", err);
    return NextResponse.json({ received: true });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
