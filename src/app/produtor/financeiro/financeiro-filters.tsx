"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const STATUS_OPCOES = [
  { value: "", label: "Todos os status" },
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
  { value: "estornado", label: "Estornado" },
];

export function FinanceiroFilters({ eventos }: { eventos: { id: string; titulo: string }[] }) {
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
    <div className="flex flex-wrap items-center gap-2.5">
      <Select
        defaultValue={searchParams.get("evento") ?? ""}
        onChange={(e) => update("evento", e.target.value)}
        className="h-9 w-auto min-w-[160px] border-[#263041] bg-[#18202e] text-sm"
      >
        <option value="">Todos os eventos</option>
        {eventos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.titulo}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="h-9 w-auto min-w-[140px] border-[#263041] bg-[#18202e] text-sm"
      >
        {STATUS_OPCOES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Input
        type="date"
        defaultValue={searchParams.get("de") ?? ""}
        onChange={(e) => update("de", e.target.value)}
        className="h-9 w-auto border-[#263041] bg-[#18202e] text-sm"
      />
      <span className="text-xs text-[#5d6b84]">até</span>
      <Input
        type="date"
        defaultValue={searchParams.get("ate") ?? ""}
        onChange={(e) => update("ate", e.target.value)}
        className="h-9 w-auto border-[#263041] bg-[#18202e] text-sm"
      />
    </div>
  );
}
