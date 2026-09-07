import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { IngressoRow } from "../ingresso-row";

export default async function IngressosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, codigo_qr, status, titular_nome, titular_cpf, intransferivel, profile_id, usado_em, criado_em, impresso_count, impresso_em, ultima_impressao_em, ticket_types(nome), orders(comprador_nome, comprador_email, comprador_telefone, comprador_cpf, canal, forma_pagamento_pdv, criado_em, pdv_terminals(nome_identificacao))",
    )
    .eq("event_id", id)
    .eq("is_cortesia", false)
    .order("criado_em", { ascending: false });

  return (
    <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Todos os ingressos</h2>
        <a href={`/produtor/eventos/${event.id}/ingressos/export`}>
          <Button variant="outline" size="sm">
            Exportar CSV
          </Button>
        </a>
      </div>

      <div className="flex flex-col gap-2.5">
        {tickets?.map((t) => (
          <IngressoRow key={t.id} ticket={t} />
        ))}
        {(!tickets || tickets.length === 0) && <p className="text-[#93a0b8]">Nenhum ingresso emitido ainda.</p>}
      </div>
    </div>
  );
}
