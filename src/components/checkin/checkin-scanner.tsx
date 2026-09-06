"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { parseQrPayload } from "@/lib/qr-payload";
import { Card, CardContent } from "@/components/ui/card";

interface Resultado {
  ok: boolean;
  mensagem: string;
  nomeLote?: string;
}

/**
 * Scanner de check-in por câmera. Usado tanto no Portal do Produtor (logado, `tokenPublico` ausente —
 * a RPC autoriza pelo auth.uid()) quanto no link fácil de colaborador (`tokenPublico` presente, sem login).
 */
export function CheckinScanner({ eventId, tokenPublico }: { eventId: string; tokenPublico?: string }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [scanning, setScanning] = useState(false);
  const lastCodeRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          if (busyRef.current || decodedText === lastCodeRef.current) return;
          lastCodeRef.current = decodedText;
          busyRef.current = true;

          const payload = parseQrPayload(decodedText);
          if (!payload || payload.e !== eventId) {
            setResultado({ ok: false, mensagem: "QR Code inválido para este evento." });
            setTimeout(() => {
              busyRef.current = false;
              lastCodeRef.current = null;
            }, 1500);
            return;
          }

          const supabase = createClient();
          const { data, error } = await supabase.rpc("validate_ticket", {
            p_codigo_qr: payload.c,
            p_assinatura_hmac: payload.s,
            p_event_id: payload.e,
            p_token_publico: tokenPublico ?? null,
          });

          const row = Array.isArray(data) ? data[0] : data;

          if (error || !row) {
            setResultado({ ok: false, mensagem: "Erro ao validar ingresso." });
          } else {
            setResultado({ ok: row.ok, mensagem: row.mensagem, nomeLote: row.nome_lote });
          }

          setTimeout(() => {
            busyRef.current = false;
            lastCodeRef.current = null;
          }, 1500);
        },
        undefined,
      )
      .then(() => setScanning(true))
      .catch(() => setResultado({ ok: false, mensagem: "Não foi possível acessar a câmera." }));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [eventId, tokenPublico]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-xl" />
      {!scanning && !resultado && <p className="text-[var(--text-muted)]">Iniciando câmera...</p>}
      {resultado && (
        <Card className={resultado.ok ? "border-[var(--success)]/40 bg-[var(--success)]/10" : "border-[var(--error)]/40 bg-[var(--error)]/10"}>
          <CardContent className="p-4 text-center">
            <p className={`text-lg font-bold ${resultado.ok ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {resultado.ok ? "✔ Acesso liberado" : "✖ Não validado"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted-2)]">{resultado.mensagem}</p>
            {resultado.nomeLote && <p className="mt-1 text-sm text-[var(--text-muted)]">{resultado.nomeLote}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
