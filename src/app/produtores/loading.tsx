import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="mt-1 h-4 w-56 animate-pulse rounded bg-[var(--surface-4)]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="h-12 w-12 rounded-xl bg-[var(--surface-4)]" />
              <div className="h-4 w-24 rounded bg-[var(--surface-4)]" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
