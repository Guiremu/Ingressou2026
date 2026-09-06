"use client";

import { useActionState } from "react";
import { atualizarTaxaMp, type TaxaState } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: TaxaState = {};

export function FeeRowForm({ id, metodo, parcelas, taxaAtual }: { id: string; metodo: string; parcelas: number; taxaAtual: number }) {
  const [state, formAction, pending] = useActionState(atualizarTaxaMp, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3 border-b border-neutral-100 py-2 text-sm">
      <input type="hidden" name="id" value={id} />
      <span className="w-24 capitalize text-[var(--text-muted-2)]">{metodo}</span>
      <span className="w-16 text-[var(--text-muted)]">{parcelas}x</span>
      <Input
        name="taxa_percentual"
        type="number"
        step="0.01"
        defaultValue={(taxaAtual * 100).toFixed(2)}
        className="w-24"
      />
      <span className="text-[var(--text-muted)]">%</span>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Salvar
      </Button>
      {state.success && <span className="text-emerald-600">✔</span>}
    </form>
  );
}
