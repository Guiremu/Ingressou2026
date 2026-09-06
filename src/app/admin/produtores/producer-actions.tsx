"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarStatusProdutor } from "./actions";
import { Button } from "@/components/ui/button";
import type { ProducerStatus } from "@/types/database";

export function ProducerActions({ id, status }: { id: string; status: ProducerStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: ProducerStatus) {
    startTransition(async () => {
      await atualizarStatusProdutor(id, next);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {status !== "aprovado" && (
        <Button size="sm" disabled={pending} onClick={() => change("aprovado")}>
          Aprovar
        </Button>
      )}
      {status !== "bloqueado" && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => change("bloqueado")}>
          Bloquear
        </Button>
      )}
      {status === "bloqueado" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => change("pendente")}>
          Reabrir análise
        </Button>
      )}
    </div>
  );
}
