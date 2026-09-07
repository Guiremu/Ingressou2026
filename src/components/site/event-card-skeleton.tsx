/** Placeholder pulsando com as mesmas dimensões do EventCard, pra usar nos loading.tsx. */
export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-[4/3] w-full animate-pulse bg-[var(--surface-4)]" />
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-4)]" />
      </div>
    </div>
  );
}
