import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const eventStatusVariant = {
  rascunho: "secondary",
  publicado: "success",
  encerrado: "secondary",
  cancelado: "destructive",
} as const;

export default async function EventosPage() {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, titulo, status, data_inicio, cidade")
    .eq("producer_id", producer.id)
    .order("data_inicio", { ascending: false });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Meus eventos</h1>
        <Link href="/produtor/eventos/novo">
          <Button size="sm">+ Criar evento</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 px-5 py-[18px]">
        {(!events || events.length === 0) && <p className="text-[#93a0b8]">Nenhum evento criado ainda.</p>}
        {events?.map((event) => (
          <Link
            key={event.id}
            href={`/produtor/eventos/${event.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#263041] bg-[#121722] p-4 transition hover:border-[#3d4a63]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{event.titulo}</p>
              <p className="truncate text-sm text-[#93a0b8]">
                {formatDate(event.data_inicio)} — {event.cidade}
              </p>
            </div>
            <Badge
              className="flex-none"
              variant={eventStatusVariant[event.status as keyof typeof eventStatusVariant]}
            >
              {event.status}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
