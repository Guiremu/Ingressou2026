"use client";

import { useActionState } from "react";
import { regenerarPdvTerminal, type PdvFormState } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: PdvFormState = {};

export function RegenerarButton({ terminalId }: { terminalId: string }) {
  const [state, formAction, pending] = useActionState(
    (_prevState: PdvFormState) => regenerarPdvTerminal(terminalId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Renovando..." : "Gerar novo link"}
      </Button>
      {state.error && <span className="text-xs text-[var(--error)]">{state.error}</span>}
      {state.success && <span className="text-xs text-[var(--success)]">{state.success}</span>}
    </form>
  );
}
