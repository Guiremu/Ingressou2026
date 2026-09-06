"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function EventFilters({ categorias, cidades }: { categorias: string[]; cidades: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar evento..."
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        defaultValue={searchParams.get("cidade") ?? ""}
        onChange={(e) => update("cidade", e.target.value)}
        className="sm:max-w-[180px]"
      >
        <option value="">Todas as cidades</option>
        {cidades.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={searchParams.get("categoria") ?? ""}
        onChange={(e) => update("categoria", e.target.value)}
        className="sm:max-w-[180px]"
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </div>
  );
}
