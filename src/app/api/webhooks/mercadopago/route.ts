import { NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { finalizePaidOrder, markOrderFailed } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

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
