import Link from "next/link";
import { getEventoDoProdutor } from "@/lib/producer";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { EventoTabs } from "./evento-tabs";

export default async function EventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, producer } = await getEventoDoProdutor(id);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">
              {event.titulo}
            </h1>
            <Badge variant="secondary">{event.status}</Badge>
          </div>
          <p className="text-xs text-[#93a0b8]">
            {formatDate(event.data_inicio)} · {event.cidade}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {event.status === "publicado" && (
            <Link
              href={`/${producer.slug}/${event.slug}`}
              target="_blank"
              className="text-xs font-medium text-[#93a0b8] underline hover:text-white"
            >
              Ver página pública ↗
            </Link>
          )}
          <StatusActions eventId={event.id} status={event.status} />
        </div>
      </div>

      <EventoTabs eventId={event.id} />

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">{children}</div>
    </div>
  );
}
