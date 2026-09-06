import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Eventos</h1>
        <Link href="/produtor/eventos/novo">
          <Button>Novo evento</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {(!events || events.length === 0) && (
          <p className="text-neutral-500">Nenhum evento criado ainda.</p>
        )}
        {events?.map((event) => (
          <Link key={event.id} href={`/produtor/eventos/${event.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-neutral-900">{event.titulo}</p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(event.data_inicio)} — {event.cidade}
                  </p>
                </div>
                <Badge variant={eventStatusVariant[event.status as keyof typeof eventStatusVariant]}>
                  {event.status}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
