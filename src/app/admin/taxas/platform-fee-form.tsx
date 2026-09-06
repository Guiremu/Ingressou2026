"use client";

import { useActionState } from "react";
import { atualizarTaxaPlataforma, type TaxaState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: TaxaState = {};

export function PlatformFeeForm({ taxaAtual }: { taxaAtual: number }) {
  const [state, formAction, pending] = useActionState(atualizarTaxaPlataforma, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="taxa_plataforma">Taxa fixa da plataforma (%)</Label>
        <Input
          id="taxa_plataforma"
          name="taxa_plataforma"
          type="number"
          step="0.01"
          defaultValue={(taxaAtual * 100).toFixed(2)}
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={pending}>
        Salvar
      </Button>
      {state.success && <span className="text-sm text-emerald-600">{state.success}</span>}
    </form>
  );
}
