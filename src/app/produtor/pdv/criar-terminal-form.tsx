"use client";

import { useActionState } from "react";
import { criarPdvTerminal, type PdvFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PdvFormState = {};

export function CriarTerminalForm() {
  const [state, formAction, pending] = useActionState(criarPdvTerminal, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#3d4a63] p-4">
      <p className="text-sm text-[#93a0b8]">
        Você ainda não tem um link de PDV. Crie um e dê pra loja parceira deixar no computador
        conectado à impressora.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome_identificacao">Nome da loja/terminal</Label>
        <Input id="nome_identificacao" name="nome_identificacao" placeholder="Ex: Loja Doce Vida — Centro" />
      </div>
      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Criando..." : "Criar link do PDV"}
      </Button>
    </form>
  );
}
