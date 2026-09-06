"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { parseQrPayload } from "@/lib/qr-payload";

export interface HistoricoItem {
  nome: string;
  detalhe: string;
  hora: string;
  cor: string;
}

interface Resultado {
  ok: boolean;
  mensagem: string;
  nomeLote?: string;
}

const RESULT_STYLES = {
  ok: { bg: "bg-[rgba(52,211,153,0.1)]", border: "border-[rgba(52,211,153,0.4)]", cor: "#34D399", glifo: "✓" },
  usado: { bg: "bg-[rgba(251,191,36,0.1)]", border: "border-[rgba(251,191,36,0.4)]", cor: "#FBBF24", glifo: "!" },
  erro: { bg: "bg-[rgba(248,113,113,0.1)]", border: "border-[rgba(248,113,113,0.4)]", cor: "#F87171", glifo: "×" },
};

function classificar(mensagem: string, ok: boolean): keyof typeof RESULT_STYLES {
  if (ok) return "ok";
  if (mensagem.toLowerCase().includes("já")) return "usado";
  return "erro";
}

/**
 * Painel de check-in completo: câmera + resultado + contador ao vivo + histórico.
 * Usado tanto no Portal do Produtor (logado, `tokenPublico` ausente — a RPC autoriza
 * pelo auth.uid()) quanto no link fácil de colaborador (`tokenPublico` presente, sem login).
 */
export function CheckinScanner({
  eventId,
  tokenPublico,
  eventoTitulo,
  initialValidados,
  initialTotal,
  initialHistorico,
  contexto,
  mostrarAvisoPortaria,
}: {
  eventId: string;
  tokenPublico?: string;
  eventoTitulo: string;
  initialValidados: number;
  initialTotal: number;
  initialHistorico: HistoricoItem[];
  contexto: string;
  mostrarAvisoPortaria: boolean;
}) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [scanning, setScanning] = useState(false);
  const [validados, setValidados] = useState(initialValidados);
  const [ultimosDezMin, setUltimosDezMin] = useState(0);
  const [historico, setHistorico] = useState(initialHistorico);
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
            if (row.ok) {
              setValidados((v) => v + 1);
              setUltimosDezMin((v) => v + 1);
              setHistorico((h) =>
                [
                  {
                    nome: row.nome_lote ?? "Ingresso",
                    detalhe: `${row.nome_lote ?? ""} · ${payload.c.slice(0, 8).toUpperCase()}`,
                    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    cor: "#34D399",
                  },
                  ...h,
                ].slice(0, 10),
              );
            }
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

  const style = resultado ? RESULT_STYLES[classificar(resultado.mensagem, resultado.ok)] : null;
  const pct = initialTotal > 0 ? Math.min(100, Math.round((validados / initialTotal) * 100)) : 0;

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#263041] bg-[#0b0e14] md:grid md:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col border-[#263041] md:border-r">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#263041] bg-[#0f141d] px-4.5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="font-[var(--font-sora)] text-[17px] font-bold text-white">Check-in</span>
            <span className="text-xs text-[#93a0b8]">{eventoTitulo}</span>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--purple)]">{contexto}</span>
        </div>

        <div className="flex flex-col gap-4 p-4.5">
          <div className="relative flex aspect-[4/3] min-h-[240px] items-center justify-center overflow-hidden rounded-[18px] bg-[#05070b]">
            <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_45%,#1B2433_0%,#05070B_75%)]" />
            <div id="qr-reader" className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            <p className="absolute bottom-3.5 left-0 right-0 text-center text-[13px] text-[#93a0b8]">
              {scanning ? "Aponte para o QR Code do ingresso" : "Iniciando câmera..."}
            </p>
          </div>

          {resultado && style && (
            <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-xl font-extrabold text-[#07070b]"
                  style={{ background: style.cor }}
                >
                  {style.glifo}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-[var(--font-sora)] text-lg font-extrabold" style={{ color: style.cor }}>
                    {resultado.ok
                      ? "Ingresso válido"
                      : resultado.mensagem.toLowerCase().includes("já")
                        ? "Já utilizado"
                        : "Ingresso inválido"}
                  </span>
                  <span className="text-[13px] leading-relaxed text-[#c7d0e0]">{resultado.mensagem}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border border-[#263041] bg-[#121722] px-3.5 py-3">
            <div className="h-3.5 w-3.5 flex-none rounded-full shadow-[inset_0_0_0_1.5px_#5d6b84]" />
            <span className="text-sm text-[#5d6b84]">Buscar por nome, CPF ou código</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col gap-3.5 border-b border-[#263041] p-4.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Ao vivo</span>
          <div className="flex items-baseline gap-2">
            <span className="font-[var(--font-sora)] text-[38px] font-extrabold tracking-tight text-[var(--accent)]">
              {validados}
            </span>
            <span className="text-[15px] text-[#93a0b8]">/ {initialTotal} validados</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#263041]">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#93a0b8]">Últimos 10 min</span>
              <span className="text-base font-bold text-white">{ultimosDezMin} entradas</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#93a0b8]">Restantes</span>
              <span className="text-base font-bold text-white">{Math.max(0, initialTotal - validados)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Histórico de validações</span>
          <div className="flex flex-col gap-2">
            {historico.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[#263041] bg-[#121722] px-3 py-2.5"
              >
                <div className="h-2 w-2 flex-none rounded-full" style={{ background: h.cor }} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-semibold text-[#e8ecf5]">{h.nome}</span>
                  <span className="truncate text-[11px] text-[#5d6b84]">{h.detalhe}</span>
                </div>
                <span className="flex-none text-xs text-[#93a0b8]">{h.hora}</span>
              </div>
            ))}
            {historico.length === 0 && <p className="text-sm text-[#5d6b84]">Nenhuma validação ainda.</p>}
          </div>

          {mostrarAvisoPortaria && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(124,92,255,0.32)] bg-[rgba(124,92,255,0.1)] p-3.5">
              <div className="mt-0.5 h-4 w-4 flex-none rounded-full bg-[var(--purple)]" />
              <p className="text-xs leading-relaxed text-[#c4b5fd]">
                Acesso por link de portaria. Você só valida e consulta ingressos — não vê financeiro nem dados de
                outros eventos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
