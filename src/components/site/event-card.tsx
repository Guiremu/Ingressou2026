import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface EventCardData {
  titulo: string;
  imagem_url: string | null;
  categoria: string | null;
  cidade: string | null;
  data_inicio: string;
  producerSlug: string;
  eventSlug: string;
  producerNome: string;
}

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      href={`/${event.producerSlug}/${event.eventSlug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-2)]"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--surface-4)]">
        {event.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imagem_url}
            alt={event.titulo}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-dim)]">
            Sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {event.categoria && <Badge variant="secondary">{event.categoria}</Badge>}
        <h3 className="line-clamp-2 font-[var(--font-sora)] text-[17px] font-bold leading-tight tracking-tight text-white">
          {event.titulo}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">{formatDate(event.data_inicio)}</p>
        <p className="text-sm text-[var(--text-muted)]">{event.cidade}</p>
        <p className="mt-auto text-xs text-[var(--text-dim)]">por {event.producerNome}</p>
      </div>
    </Link>
  );
}
