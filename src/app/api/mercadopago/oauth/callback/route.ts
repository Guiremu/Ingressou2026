import { NextResponse } from "next/server";
import { exchangeMpOAuthCode } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const producerId = url.searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (!code || !producerId) {
    return NextResponse.redirect(`${siteUrl}/produtor/conta?erro=parametros_invalidos`);
  }

  try {
    const result = await exchangeMpOAuthCode(code);
    const admin = createAdminClient();

    await admin
      .from("producers")
      .update({
        mp_user_id: String(result.user_id ?? ""),
        mp_access_token: result.access_token,
        mp_refresh_token: result.refresh_token,
        mp_public_key: result.public_key,
      })
      .eq("id", producerId);

    return NextResponse.redirect(`${siteUrl}/produtor/conta?conectado=1`);
  } catch (err) {
    console.error("Erro no callback OAuth do Mercado Pago:", err);
    return NextResponse.redirect(`${siteUrl}/produtor/conta?erro=oauth`);
  }
}
