"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarValidator } from "./actions";
import { Button } from "@/components/ui/button";

export function ValidatorToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await alternarValidator(id, !ativo);
          router.refresh();
        })
      }
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}
