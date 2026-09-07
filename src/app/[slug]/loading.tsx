import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";
import { EventCardSkeleton } from "@/components/site/event-card-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8">
        <div className="h-[168px] w-full animate-pulse rounded-b-[24px] bg-[var(--surface-4)]" />

        <div className="-mt-[34px] flex items-end gap-4 px-1">
          <div className="h-[84px] w-[84px] animate-pulse rounded-[20px] border-2 border-[#0e0e16] bg-[var(--surface-4)]" />
          <div className="flex flex-col gap-2 pb-1">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-4)]" />
            <div className="h-3 w-52 animate-pulse rounded bg-[var(--surface-4)]" />
          </div>
        </div>

        <div className="mt-3.5 flex gap-5 border-b border-[var(--border)] px-1 pb-3">
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--surface-4)]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-4)]" />
          <div className="h-4 w-14 animate-pulse rounded bg-[var(--surface-4)]" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-[18px] px-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
