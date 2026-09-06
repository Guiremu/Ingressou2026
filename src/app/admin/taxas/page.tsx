import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FeeRowForm } from "./fee-row-form";
import { PlatformFeeForm } from "./platform-fee-form";

export default async function TaxasPage() {
  const supabase = await createClient();

  const { data: fees } = await supabase
    .from("mp_fee_table")
    .select("*")
    .order("metodo_pagamento", { ascending: true })
    .order("parcelas", { ascending: true });

  const { data: platformConfig } = await supabase
    .from("platform_config")
    .select("taxa_plataforma_percentual")
    .eq("id", true)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Taxas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Taxa da plataforma</CardTitle>
          <CardDescription>Percentual fixo retido pela plataforma sobre o valor de cada ingresso.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformFeeForm taxaAtual={Number(platformConfig?.taxa_plataforma_percentual ?? 0.03)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela de taxas do Mercado Pago</CardTitle>
          <CardDescription>
            Referência usada para calcular o repasse ao produtor e o acréscimo do parcelamento.
            Ajuste conforme o contrato real da conta MP da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fees?.map((fee) => (
            <FeeRowForm
              key={fee.id}
              id={fee.id}
              metodo={fee.metodo_pagamento}
              parcelas={fee.parcelas}
              taxaAtual={Number(fee.taxa_percentual)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
