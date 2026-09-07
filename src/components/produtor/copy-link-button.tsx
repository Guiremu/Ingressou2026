"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={copiar}>
      {copiado ? "Copiado!" : "Copiar link"}
    </Button>
  );
}
