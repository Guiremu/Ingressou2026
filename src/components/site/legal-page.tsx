import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export function LegalPage({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">{titulo}</h1>
        <div className="prose-legal mt-6 flex flex-col gap-4 text-sm leading-relaxed text-[var(--text-muted-2)] [&_h2]:mt-4 [&_h2]:font-[var(--font-sora)] [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
