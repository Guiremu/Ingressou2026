import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="h-8 w-52 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex h-24 animate-pulse items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="h-16 w-16 flex-none rounded-xl bg-[var(--surface-4)]" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-1/2 rounded bg-[var(--surface-4)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--surface-4)]" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
