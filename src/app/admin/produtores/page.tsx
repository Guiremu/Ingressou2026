import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProducerActions } from "./producer-actions";

const statusVariant = { pendente: "warning", aprovado: "success", bloqueado: "destructive" } as const;

export default async function ProdutoresPage() {
  const supabase = await createClient();

  const { data: producers } = await supabase
    .from("producers")
    .select("id, razao_social, nome_fantasia, tipo_pessoa, cpf, cnpj, slug, status, criado_em")
    .order("criado_em", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Produtores</h1>

      <div className="flex flex-col gap-3">
        {producers?.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-neutral-900">{p.nome_fantasia ?? p.razao_social}</p>
                <p className="text-sm text-neutral-500">
                  {p.tipo_pessoa === "juridica" ? `CNPJ ${p.cnpj}` : "Pessoa física"} — CPF {p.cpf}
                </p>
                <p className="text-sm text-neutral-500">/{p.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[p.status as keyof typeof statusVariant]}>{p.status}</Badge>
                <ProducerActions id={p.id} status={p.status} />
              </div>
            </CardContent>
          </Card>
        ))}
        {(!producers || producers.length === 0) && <p className="text-neutral-500">Nenhum produtor cadastrado.</p>}
      </div>
    </div>
  );
}
