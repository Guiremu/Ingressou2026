import { Suspense } from "react";
import { SiteHeader } from "./site-header";
import { SiteHeaderSkeleton } from "./site-header-skeleton";

/**
 * SiteHeader depende de uma checagem de login (round-trip ao Supabase) que não deve bloquear
 * o resto da página. Envolvendo em Suspense, o conteúdo da página começa a chegar (streaming)
 * enquanto o header real ainda resolve — o skeleton aparece na hora, sem salto de layout.
 */
export function SiteHeaderAsync() {
  return (
    <Suspense fallback={<SiteHeaderSkeleton />}>
      <SiteHeader />
    </Suspense>
  );
}
