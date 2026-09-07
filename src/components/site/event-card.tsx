import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export interface EventCardData {
  titulo: string;
  imagem_url: string | null;
  categoria: string | null;
  cidade: string | null;
  data_inicio: string;
  precoMinimo: number | null;
  producerSlug: string;
  eventSlug: string;
  producerNome: string;
  mostrarProdutor?: boolean;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export function EventCard({ event }: { event: EventCardData }) {
  const data = new Date(event.data_inicio);
  const diaSemana = DIAS_SEMANA[data.getDay()];
  const dataCompacta = `${String(data.getDate()).padStart(2, "0")} ${MESES[data.getMonth()]}`;

  return (
    <Link
      href={`/${event.producerSlug}/${event.eventSlug}`}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-2)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-4)]">
        {event.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imagem_url}
            alt={event.titulo}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : null}
        <div className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(7,7,11,0.72)] px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-[var(--accent)]">
          {dataCompacta}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--purple)]">
          {event.categoria ?? "Evento"}
          {event.mostrarProdutor !== false ? ` · ${event.producerNome}` : ""}
        </p>
        <h3 className="line-clamp-2 font-[var(--font-sora)] text-[17px] font-bold leading-tight tracking-tight text-white">
          {event.titulo}
        </h3>
        <p className="text-xs text-[var(--text-muted-2)]">
          {diaSemana}, {dataCompacta.toLowerCase()} · {event.cidade}
        </p>
        {event.precoMinimo !== null && (
          <div className="mt-0.5 flex items-baseline gap-1.5">
            {event.precoMinimo > 0 && <span className="text-[11px] text-[var(--text-dim)]">a partir de</span>}
            <span className="font-[var(--font-sora)] text-base font-bold text-[var(--accent)]">
              {event.precoMinimo > 0 ? formatCurrency(event.precoMinimo) : "Grátis"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
