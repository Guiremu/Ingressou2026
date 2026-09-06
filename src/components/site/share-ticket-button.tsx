"use client";

import { useState } from "react";

export function ShareTicketButton({ eventoTitulo }: { eventoTitulo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Ingresso — ${eventoTitulo}`, url });
        return;
      } catch {
        // Usuário cancelou o compartilhamento — não faz nada.
        return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      className="flex items-center justify-center gap-2.5 rounded-2xl border border-[var(--border-2)] bg-[var(--surface)] px-4 py-3.5 text-sm font-bold text-white"
    >
      {copiado ? "Link copiado!" : "Exportar / enviar para outra pessoa"}
    </button>
  );
}
