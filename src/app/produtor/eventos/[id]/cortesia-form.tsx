"use client";

import { useActionState, useState } from "react";
import { gerarCortesias, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

export function CortesiaForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(gerarCortesias, initialState);
  const [intransferivel, setIntransferivel] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border-2)] p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="flex flex-wrap items-end gap-3">
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
      </div>

      <div className="flex items-center gap-2">
        <input
          id="cortesia_intransferivel"
          type="checkbox"
          checked={intransferivel}
          onChange={(e) => setIntransferivel(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-2)]"
        />
        <input type="hidden" name="intransferivel" value={intransferivel ? "1" : ""} />
        <Label htmlFor="cortesia_intransferivel" className="cursor-pointer">
          Intransferível — exigir documento com foto na portaria
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cortesia_titular_nome">Nome do titular {intransferivel && "(obrigatório)"}</Label>
          <Input id="cortesia_titular_nome" name="titular_nome" placeholder="Se for pra uma pessoa específica" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cortesia_titular_cpf">CPF do titular (opcional)</Label>
          <Input id="cortesia_titular_cpf" name="titular_cpf" inputMode="numeric" />
        </div>
      </div>

      <p className="text-xs text-[var(--text-dim)]">
        Se marcar quantidade maior que 1 com nome preenchido, todas as cortesias geradas dessa vez ficam com o mesmo
        nome — pra pessoas diferentes, gere uma de cada vez.
      </p>

      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--success)]">{state.success}</p>}
    </form>
  );
}
