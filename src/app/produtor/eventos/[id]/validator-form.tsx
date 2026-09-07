"use client";

import { useActionState } from "react";
import { criarValidator, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = {};

export function ValidatorForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(criarValidator, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-[14px] border border-dashed border-[#3d4a63] p-4">
      <input type="hidden" name="event_id" value={eventId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="val_nome">Identificação</Label>
        <Input id="val_nome" name="nome_identificacao" placeholder="Portaria - João" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="val_expira">Expira em (opcional)</Label>
        <Input id="val_expira" name="expira_em" type="datetime-local" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Criando..." : "Criar link de validação"}
      </Button>
      {state.error && <p className="w-full text-sm text-[var(--error)]">{state.error}</p>}
    </form>
  );
}
