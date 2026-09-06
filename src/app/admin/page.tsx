import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    { count: produtoresPendentes },
    { count: produtoresAprovados },
    { count: produtoresTotal },
    { count: eventosAtivos },
    { data: ordersDoMes },
    { data: splits },
    { count: ingressosEmitidos },
    { count: cortesias },
  ] = await Promise.all([
    supabase.from("producers").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("producers").select("*", { count: "exact", head: true }).eq("status", "aprovado"),
    supabase.from("producers").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "publicado"),
    supabase
      .from("orders")
      .select("valor_ingressos")
      .eq("status", "pago")
      .gte("criado_em", inicioMes.toISOString()),
    supabase.from("payment_splits").select("valor_bruto, taxa_plataforma, valor_liquido_produtor"),
    supabase.from("tickets").select("*", { count: "exact", head: true }).neq("status", "cancelado"),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("is_cortesia", true),
  ]);

  const gmvDoMes = (ordersDoMes ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0);
  const gmvTotal = (splits ?? []).reduce((acc, s) => acc + Number(s.valor_bruto), 0);
  const receitaTaxas = (splits ?? []).reduce((acc, s) => acc + Number(s.taxa_plataforma), 0);
  const aRepassar = (splits ?? []).reduce((acc, s) => acc + Number(s.valor_liquido_produtor), 0);
  const mediaTaxas = gmvTotal > 0 ? (receitaTaxas / gmvTotal) * 100 : 0;

  const stats = [
    { label: "GMV do mês", valor: formatCurrency(gmvDoMes), cor: "text-white", sub: `${produtoresAprovados ?? 0} produtores aprovados` },
    { label: "Receita de taxas", valor: formatCurrency(receitaTaxas), cor: "text-[var(--pink)]", sub: `média de ${mediaTaxas.toFixed(1).replace(".", ",")}%` },
    { label: "A repassar", valor: formatCurrency(aRepassar), cor: "text-white", sub: "saldo líquido dos produtores" },
    { label: "Ingressos emitidos", valor: String(ingressosEmitidos ?? 0), cor: "text-white", sub: `${cortesias ?? 0} cortesias` },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">Plataforma</h1>
          <p className="text-xs text-[#93a0b8]">
            {produtoresTotal ?? 0} produtores · {eventosAtivos ?? 0} eventos ativos
          </p>
        </div>
        {(produtoresPendentes ?? 0) > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.1)] px-3.5 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
            <span className="text-xs font-bold text-[#fde68a]">
              {produtoresPendentes} produtor{produtoresPendentes === 1 ? "" : "es"} aguardando aprovação
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 rounded-2xl border border-[#263041] bg-[#121722] p-4">
              <span className="text-xs text-[#93a0b8]">{s.label}</span>
              <span className={`font-[var(--font-sora)] text-2xl font-bold ${s.cor}`}>{s.valor}</span>
              <span className="text-xs text-[#93a0b8]">{s.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
