"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function EventFilters({ categorias, cidades }: { categorias: string[]; cidades: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const cidadeAtual = searchParams.get("cidade") ?? "";
  const categoriaAtual = searchParams.get("categoria") ?? "";
  const temFiltro = Boolean(cidadeAtual || categoriaAtual);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative flex flex-col">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar evento..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => update("q", e.target.value)}
          className="flex-1 sm:max-w-xs"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Filtros"
          className={`relative flex h-10 w-10 flex-none items-center justify-center rounded-xl border transition ${
            open || temFiltro
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-muted-2)]"
          } bg-[var(--surface-4)]`}
        >
          <SlidersHorizontal size={17} />
          {temFiltro && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
        </button>
      </div>

      {open && (
        <div className="mt-2.5 flex flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:absolute sm:right-0 sm:top-full sm:z-20 sm:mt-2 sm:w-72 sm:shadow-xl">
          <Select defaultValue={cidadeAtual} onChange={(e) => update("cidade", e.target.value)}>
            <option value="">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select defaultValue={categoriaAtual} onChange={(e) => update("categoria", e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("cidade");
                params.delete("categoria");
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="self-start text-xs font-medium text-[var(--text-dim)] underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
