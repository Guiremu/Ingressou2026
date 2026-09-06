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
      <div>
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Plataforma</h1>
        <p className="text-xs text-[var(--text-muted)]">Visão consolidada de vendas e produtores</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Produtores pendentes" value={String(produtoresPendentes ?? 0)} />
        <Stat label="Produtores aprovados" value={String(produtoresAprovados ?? 0)} />
        <Stat label="Eventos publicados" value={String(eventosPublicados ?? 0)} />
        <Stat label="Receita da plataforma (3%)" value={formatCurrency(receitaPlataforma)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total vendido (bruto)</CardTitle>
        </CardHeader>
        <CardContent className="font-[var(--font-sora)] text-[24px] font-bold text-white">
          {formatCurrency(totalBruto)}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={`font-[var(--font-sora)] text-[21px] font-bold ${accent ? "text-[var(--accent)]" : "text-white"}`}
      >
        {value}
      </CardContent>
    </Card>
  );
}
