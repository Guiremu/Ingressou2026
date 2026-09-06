"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarStatusEvento } from "./actions";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/types/database";

export function StatusActions({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: EventStatus) {
    startTransition(async () => {
      const result = await atualizarStatusEvento(eventId, next);
      if (result.error) alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {status === "rascunho" && (
        <Button disabled={pending} onClick={() => change("publicado")}>
          Publicar evento
        </Button>
      )}
      {status === "publicado" && (
        <Button disabled={pending} variant="outline" onClick={() => change("encerrado")}>
          Encerrar vendas
        </Button>
      )}
      {status !== "cancelado" && (
        <Button disabled={pending} variant="destructive" onClick={() => change("cancelado")}>
          Cancelar evento
        </Button>
      )}
    </div>
  );
}
