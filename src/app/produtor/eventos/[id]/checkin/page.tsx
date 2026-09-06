import { notFound } from "next/navigation";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { CheckinScanner } from "@/components/checkin/checkin-scanner";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("id, titulo, producer_id").eq("id", id).single();
  if (!event || event.producer_id !== producer.id) notFound();

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold text-white">Check-in — {event.titulo}</h1>
      <p className="text-[var(--text-muted)]">Aponte a câmera para o QR Code do ingresso.</p>
      <CheckinScanner eventId={event.id} />
    </div>
  );
}
