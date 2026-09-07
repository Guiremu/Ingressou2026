"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarStatusEvento } from "./actions";
import { Button } from "@/components/ui/button";
import type { EventStatus } from "@/types/database";

export function EncerrarVendasButton({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (status !== "publicado") return null;

  function encerrar() {
    startTransition(async () => {
      const result = await atualizarStatusEvento(eventId, "encerrado");
      if (result.error) alert(result.error);
      router.refresh();
    });
  }

  return (
    <Button disabled={pending} variant="outline" size="sm" onClick={encerrar}>
      Encerrar vendas
    </Button>
  );
}
