import { getEventoDoProdutor } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ValidatorForm } from "../validator-form";
import { ValidatorToggle } from "../validator-toggle";

export default async function ColaboradoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getEventoDoProdutor(id);
  const supabase = await createClient();

  const { data: validators } = await supabase
    .from("validators")
    .select("*")
    .eq("event_id", id)
    .order("criado_em", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
      <h2 className="mb-1 font-[var(--font-sora)] text-base font-bold text-white">Colaboradores de portaria</h2>
      <p className="mb-3.5 text-sm text-[#93a0b8]">
        Crie um link de check-in pra cada pessoa da portaria — não precisam de conta nem login.
      </p>
      <div className="flex flex-col gap-3">
        {validators?.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5"
          >
            <div>
              <p className="font-medium text-white">{v.nome_identificacao}</p>
              <p className="break-all text-xs text-[#93a0b8]">
                {siteUrl}/validar/{event.slug}?token={v.token_publico}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={v.ativo ? "success" : "secondary"}>{v.ativo ? "Ativo" : "Inativo"}</Badge>
              <ValidatorToggle id={v.id} ativo={v.ativo} />
            </div>
          </div>
        ))}
        <ValidatorForm eventId={event.id} />
      </div>
    </div>
  );
}
