import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [{ count: produtoresPendentes }, { count: produtoresAprovados }, { count: eventosPublicados }, { data: orders }] =
    await Promise.all([
      supabase.from("producers").select("*", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("producers").select("*", { count: "exact", head: true }).eq("status", "aprovado"),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "publicado"),
      supabase.from("orders").select("valor_ingressos, valor_total_cobrado").eq("status", "pago"),
    ]);

  const totalBruto = (orders ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
  const receitaPlataforma = totalBruto * 0.03;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Visão geral</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Produtores pendentes" value={String(produtoresPendentes ?? 0)} />
        <Stat label="Produtores aprovados" value={String(produtoresAprovados ?? 0)} />
        <Stat label="Eventos publicados" value={String(eventosPublicados ?? 0)} />
        <Stat label="Receita da plataforma (3%)" value={formatCurrency(receitaPlataforma)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total vendido (bruto)</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-neutral-900">{formatCurrency(totalBruto)}</CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-neutral-500">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold text-neutral-900">{value}</CardContent>
    </Card>
  );
}
