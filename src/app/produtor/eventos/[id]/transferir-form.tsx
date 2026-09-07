"use client";

import { useActionState } from "react";
import { transferirIngresso, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: FormState = {};

export function TransferirForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(transferirIngresso, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Input name="cpf" placeholder="CPF da conta" inputMode="numeric" className="h-8 w-36 text-xs" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Vinculando..." : "Vincular por CPF"}
      </Button>
      {state.error && <span className="text-xs text-[var(--error)]">{state.error}</span>}
      {state.success && <span className="text-xs text-[var(--success)]">{state.success}</span>}
    </form>
  );
}
