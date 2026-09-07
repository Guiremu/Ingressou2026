import { SiteHeaderSkeleton } from "@/components/site/site-header-skeleton";
import { EventCardSkeleton } from "@/components/site/event-card-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Ariquemes · RO</p>
        <h1 className="mt-2 font-[var(--font-sora)] text-[34px] font-extrabold leading-[1.05] tracking-tight text-white">
          O que rola
          <br />
          na cidade
        </h1>
        <div className="mt-6 h-10 w-full max-w-md animate-pulse rounded-full bg-[var(--surface-4)]" />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
