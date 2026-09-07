import type { ReactNode } from "react";

/**
 * Moldura visual compartilhada pelas telas de autenticação (login/cadastro) — cartão
 * escuro com faixa em gradiente no topo, no mesmo estilo usado no checkout e no ingresso.
 */
export function AuthCard({
  title,
  subtitle,
  maxWidthClassName = "max-w-sm",
  children,
}: {
  title: string;
  subtitle: string;
  maxWidthClassName?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className={`w-full ${maxWidthClassName} overflow-hidden rounded-[24px] border border-[var(--border)] bg-[#0e0e16]`}>
        <div className="flex flex-col items-center gap-2.5 bg-[linear-gradient(135deg,#7C5CFF_0%,#2A1B66_60%,#FF4D8D_130%)] px-6 py-8 text-center">
          <div className="flex items-center gap-2">
            <div className="h-[20px] w-[20px] rounded-[6px] bg-[var(--accent)]" />
            <span className="font-[var(--font-sora)] text-base font-extrabold tracking-tight text-white">
              ingressou
            </span>
          </div>
          <h1 className="mt-1 font-[var(--font-sora)] text-xl font-extrabold text-white">{title}</h1>
          <p className="text-sm text-white/85">{subtitle}</p>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </main>
  );
}
