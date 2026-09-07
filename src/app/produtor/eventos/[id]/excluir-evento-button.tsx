"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirEvento } from "./actions";
import { Button } from "@/components/ui/button";

export function ExcluirEventoButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function excluir() {
    if (!window.confirm("Excluir este evento de vez? Essa ação não pode ser desfeita.")) return;
    startTransition(async () => {
      const result = await excluirEvento(eventId);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.push("/produtor/eventos");
    });
  }

  return (
    <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={excluir}>
      {pending ? "Excluindo..." : "Excluir evento"}
    </Button>
  );
}
