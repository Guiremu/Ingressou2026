"use client";

import { useActionState } from "react";
import { criarLote, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = {};

export function LoteForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(criarLote, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border-2)] p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_nome">Nome do lote</Label>
          <Input id="lote_nome" name="nome" placeholder="1º Lote Pista" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_preco">Preço (R$)</Label>
          <Input id="lote_preco" name="preco" type="number" step="0.01" min="0" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_qtd">Quantidade total</Label>
          <Input id="lote_qtd" name="quantidade_total" type="number" min="1" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_max">Máx. por pedido</Label>
          <Input id="lote_max" name="max_por_pedido" type="number" min="1" defaultValue={10} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_inicio">Início das vendas</Label>
          <Input id="lote_inicio" name="data_inicio_venda" type="datetime-local" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="lote_fim">Fim das vendas</Label>
          <Input id="lote_fim" name="data_fim_venda" type="datetime-local" />
        </div>
      </div>
      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Adicionar lote"}
      </Button>
    </form>
  );
}
