import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-foreground)]",
        secondary: "bg-[var(--surface-3)] text-[var(--text-muted-2)]",
        success: "bg-[var(--success)]/15 text-[var(--success)]",
        warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
        destructive: "bg-[var(--pink)]/15 text-[var(--pink)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
