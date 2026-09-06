"use client";

import { useActionState } from "react";
import { gerarCortesias, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

export function CortesiaForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(gerarCortesias, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-neutral-300 p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="cortesia_qtd">Quantidade</Label>
        <Input id="cortesia_qtd" name="quantidade" type="number" min="1" defaultValue={1} className="w-24" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="cortesia_motivo">Motivo</Label>
        <Select id="cortesia_motivo" name="motivo" className="w-40">
          <option value="funcionario">Funcionário</option>
          <option value="amigo">Amigo</option>
          <option value="patrocinador">Patrocinador</option>
          <option value="outro">Outro</option>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Gerando..." : "Gerar cortesias"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
