"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EventoTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/produtor/eventos/${eventId}`;

  const tabs = [
    { href: base, label: "Visão geral" },
    { href: `${base}/lotes`, label: "Lotes" },
    { href: `${base}/cortesias`, label: "Cortesias" },
    { href: `${base}/colaboradores`, label: "Colaboradores" },
    { href: `${base}/ingressos`, label: "Ingressos" },
    { href: `${base}/checkin`, label: "Check-in" },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[#263041] px-5">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-none whitespace-nowrap px-3.5 py-3 text-sm font-semibold",
              active
                ? "text-white shadow-[inset_0_-2px_0_var(--accent)]"
                : "text-[#93a0b8] hover:text-white",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
