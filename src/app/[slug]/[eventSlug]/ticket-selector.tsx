"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export interface LoteSelecionavel {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  restantes: number;
  maxPorPedido: number;
}

export function TicketSelector({ eventId, lotes }: { eventId: string; lotes: LoteSelecionavel[] }) {
  const router = useRouter();
  const [qtds, setQtds] = useState<Record<string, number>>({});

  function setQtd(id: string, value: number) {
    setQtds((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  }

  const subtotal = useMemo(
    () => lotes.reduce((acc, l) => acc + (qtds[l.id] ?? 0) * l.preco, 0),
    [lotes, qtds],
  );
  const totalIngressos = Object.values(qtds).reduce((a, b) => a + b, 0);

  function continuar() {
    const itens = lotes
      .filter((l) => (qtds[l.id] ?? 0) > 0)
      .map((l) => ({ ticketTypeId: l.id, quantidade: qtds[l.id] }));
    if (itens.length === 0) return;
    const query = encodeURIComponent(JSON.stringify(itens));
    router.push(`/checkout/${eventId}?itens=${query}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[18px] lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Ingressos</h2>
      </div>

      {lotes.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum lote disponível no momento.</p>}

      {lotes.map((lote) => {
        const esgotado = lote.restantes <= 0;
        const qtd = qtds[lote.id] ?? 0;
        const alerta =
          lote.restantes > 0 && lote.restantes <= 15
            ? { texto: `Últimas ${lote.restantes} unidades`, cor: "text-[var(--warning)]" }
            : lote.restantes > 0
              ? { texto: `${lote.restantes} restantes`, cor: "text-[var(--accent)]" }
              : { texto: "Esgotado", cor: "text-[var(--text-dim)]" };

        return (
          <div
            key={lote.id}
            className="flex flex-col gap-2 rounded-[14px] border border-[var(--border-2)] bg-[#1b1b26] p-[14px]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] font-semibold text-white">{lote.nome}</p>
              <p className="font-[var(--font-sora)] text-[17px] font-bold text-white">
                {formatCurrency(lote.preco)}
              </p>
            </div>
            {lote.descricao && <p className="text-xs text-[var(--text-muted-2)]">{lote.descricao}</p>}
            <div className="mt-1 flex items-center justify-between">
              <p className={`text-xs font-semibold ${alerta.cor}`}>{alerta.texto}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={esgotado || qtd === 0}
                  onClick={() => setQtd(lote.id, qtd - 1)}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[var(--border-2)] text-lg text-[#e6e6f0] disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-[16px] text-center font-[var(--font-sora)] text-base font-bold text-white">
                  {qtd}
                </span>
                <button
                  type="button"
                  disabled={esgotado || qtd >= Math.min(lote.maxPorPedido, lote.restantes)}
                  onClick={() => setQtd(lote.id, qtd + 1)}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--accent)] text-lg font-bold text-[var(--accent-foreground)] disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {lotes.length > 0 && (
        <>
          <div className="my-1 h-px bg-[#262633]" />
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] text-[var(--text-muted)]">
              {totalIngressos === 1 ? "1 ingresso" : `${totalIngressos} ingressos`}
            </p>
            <p className="font-[var(--font-sora)] text-[22px] font-bold text-white">{formatCurrency(subtotal)}</p>
          </div>
          <Button disabled={totalIngressos === 0} onClick={continuar} className="w-full rounded-[14px]">
            Continuar
          </Button>
          <p className="text-center text-[11px] text-[var(--text-dim)]">Taxa de serviço calculada no checkout</p>
        </>
      )}
    </div>
  );
}
