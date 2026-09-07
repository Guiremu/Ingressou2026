"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarStatusEvento } from "./actions";
import { Button } from "@/components/ui/button";

export function CancelarEventoButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function cancelar() {
    if (!window.confirm("Cancelar este evento? Ele para de vender e some da vitrine pública.")) return;
    startTransition(async () => {
      const result = await atualizarStatusEvento(eventId, "cancelado");
      if (result.error) alert(result.error);
      router.refresh();
    });
  }

  return (
    <Button disabled={pending} variant="destructive" onClick={cancelar}>
      Cancelar evento
    </Button>
  );
}
