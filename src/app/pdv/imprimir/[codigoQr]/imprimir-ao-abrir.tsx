"use client";

import { useEffect } from "react";

/** Dispara o diálogo de impressão do navegador ao abrir a página do recibo. */
export function ImprimirAoAbrir() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent,#d3ff4a)] px-5 py-2.5 text-sm font-bold text-black print:hidden"
    >
      Imprimir
    </button>
  );
}
