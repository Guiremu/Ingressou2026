export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <div className="flex flex-col gap-2">
          <div className="h-5 w-32 animate-pulse rounded bg-[#1c2532]" />
          <div className="h-3 w-44 animate-pulse rounded bg-[#1c2532]" />
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[14px] border border-[#263041] bg-[#18202e]" />
          ))}
        </div>

        <div className="flex flex-wrap overflow-hidden rounded-2xl border border-[#263041] bg-[#121722]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col gap-2 p-3.5" style={{ minWidth: 160 }}>
              <div className="h-3 w-20 animate-pulse rounded bg-[#1c2532]" />
              <div className="h-5 w-16 animate-pulse rounded bg-[#1c2532]" />
            </div>
          ))}
        </div>

        <div className="h-56 animate-pulse rounded-2xl border border-[#263041] bg-[#121722]" />
        <div className="h-32 animate-pulse rounded-2xl border border-[#263041] bg-[#121722]" />
      </div>
    </div>
  );
}
