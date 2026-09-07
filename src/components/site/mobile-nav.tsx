"use client";

import { useState } from "react";
import Link from "next/link";

interface MobileNavProfile {
  nome: string;
  role: "admin" | "produtor" | "colaborador" | "cliente";
}

export function MobileNav({ profile }: { profile: MobileNavProfile | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-[5px]"
      >
        <span className={`h-[2px] w-5 bg-white transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
        <span className={`h-[2px] w-5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`h-[2px] w-5 bg-white transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
      </button>

      {open && (
        <div className="fixed inset-x-0 top-[57px] z-50 border-b border-[var(--border)] bg-[#07070b] px-4 py-4">
          <nav className="flex flex-col gap-1 text-[15px]">
            <Link href="/" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 font-semibold text-white">
              Eventos
            </Link>
            <Link href="/produtores" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[var(--text-muted-2)]">
              Produtores
            </Link>
            <Link href="/meus-ingressos" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[var(--text-muted-2)]">
              Meus ingressos
            </Link>
          </nav>

          <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border)] pt-2 text-[15px]">
            {profile ? (
              <>
                {(profile.role === "produtor" || profile.role === "colaborador") && (
                  <Link href="/produtor" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[var(--text-muted-2)]">
                    Portal do Produtor
                  </Link>
                )}
                {profile.role === "admin" && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[var(--text-muted-2)]">
                    Gestor ADM
                  </Link>
                )}
                <Link href="/perfil" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-[var(--text-muted-2)]">
                  {profile.nome.split(" ")[0]}
                </Link>
                <form action="/logout" method="post">
                  <button type="submit" className="w-full rounded-lg px-2 py-2.5 text-left text-[var(--text-muted-2)]">
                    Sair
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[var(--accent)] px-[18px] py-2.5 text-center text-[13px] font-bold text-[var(--accent-foreground)]"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro/produtor"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-lg px-2 py-2.5 text-center text-[var(--text-muted-2)]"
                >
                  Sou produtor
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
