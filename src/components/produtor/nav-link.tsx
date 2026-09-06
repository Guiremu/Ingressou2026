"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProdutorNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/produtor" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "rounded-[10px] px-3 py-2.5 text-sm",
        active ? "bg-[var(--accent)] font-semibold text-[#0b0e14]" : "text-[#93a0b8] hover:bg-white/5",
      )}
    >
      {label}
    </Link>
  );
}
