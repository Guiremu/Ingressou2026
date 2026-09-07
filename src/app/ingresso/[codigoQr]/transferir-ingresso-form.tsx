"use client";

import { useActionState, useState } from "react";
import { transferirIngressoAutoatendimento, type TransferState } from "./actions";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";

const initialState: TransferState = {};

export function TransferirIngressoForm({ codigoQr }: { codigoQr: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(transferirIngressoAutoatendimento, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-3.5 text-center text-sm font-semibold text-[var(--success)]">
        {state.success}
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-2xl border border-dashed border-[var(--border-2)] bg-[var(--surface)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-muted-2)]"
      >
        Transferir ingresso
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input type="hidden" name="codigo_qr" value={codigoQr} />
      <p className="text-sm font-semibold text-white">Transferir ingresso</p>
      <p className="text-xs text-[var(--text-muted-2)]">
        Só é possível transferir para uma conta já cadastrada na Ingressou. Informe o CPF dela.
      </p>
      <MaskedInput mask="cpf" name="cpf" placeholder="CPF da conta de destino" />
      {state.error && <p className="text-xs text-[var(--error)]">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} className="flex-1">
          {pending ? "Transferindo..." : "Confirmar transferência"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
