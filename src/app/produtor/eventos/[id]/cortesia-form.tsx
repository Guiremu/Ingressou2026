"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { gerarCortesia, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initialState: FormState = {};

export function CortesiaForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(gerarCortesia, initialState);
  const [intransferivel, setIntransferivel] = useState(true);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border-2)] p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <p className="text-xs text-[var(--text-dim)]">
        Cada cortesia é gerada individualmente, com o titular dela. Pra outra pessoa, gere de novo.
      </p>

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
          <Input id="cortesia_titular_nome" name="titular_nome" required={intransferivel} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cortesia_titular_cpf">CPF do titular {intransferivel && "(obrigatório)"}</Label>
          <Input id="cortesia_titular_cpf" name="titular_cpf" inputMode="numeric" required={intransferivel} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
          {pending ? "Gerando..." : "Gerar cortesia"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      {state.success && state.codigoQr && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--success)]/10 p-3 text-sm">
          <span className="text-[var(--success)]">{state.success}</span>
          <Link href={`/ingresso/${state.codigoQr}`} target="_blank" className="font-medium text-[var(--accent)] underline">
            Ver ingresso
          </Link>
          <a href={`/ingresso/${state.codigoQr}/pdf`} className="font-medium text-[var(--accent)] underline">
            Baixar PDF
          </a>
          <a href={`/ingresso/${state.codigoQr}/imagem`} className="font-medium text-[var(--accent)] underline">
            Baixar imagem
          </a>
        </div>
      )}
    </form>
  );
}
