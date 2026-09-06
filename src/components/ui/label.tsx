import { cn } from "@/lib/utils";
import * as React from "react";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]",
        className,
      )}
      {...props}
    />
  );
}
