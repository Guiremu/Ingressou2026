import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="rounded-[24px] border border-[var(--border)] bg-[#0e0e16] p-5">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-1 items-center gap-2">
                <div className="h-[26px] w-[26px] animate-pulse rounded-full bg-[var(--surface-4)]" />
                <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-4)]" />
                {n < 3 && <div className="h-px flex-1 bg-[var(--border)]" />}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.85fr]">
            <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
            <div className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          </div>
        </div>
      </main>
    </div>
  );
}
