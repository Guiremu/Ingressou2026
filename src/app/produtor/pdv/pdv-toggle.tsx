"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarPdvTerminal } from "./actions";
import { Button } from "@/components/ui/button";

export function PdvToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await alternarPdvTerminal(id, !ativo);
          router.refresh();
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}
