import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="aspect-[21/9] w-full animate-pulse rounded-[24px] bg-[var(--surface-4)]" />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.95fr] lg:items-start">
          <div className="flex flex-col gap-3">
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--surface-4)]" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-[var(--surface-4)]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--surface-4)]" />
            <div className="mt-4 h-24 w-full animate-pulse rounded-2xl bg-[var(--surface-4)]" />
          </div>
          <div className="h-72 w-full animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
        </div>
      </main>
    </div>
  );
}
