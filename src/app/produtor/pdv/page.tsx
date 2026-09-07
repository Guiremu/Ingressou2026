import Link from "next/link";
import { requireProducer } from "@/lib/producer";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { CopyLinkButton } from "@/components/produtor/copy-link-button";
import { CriarTerminalForm } from "./criar-terminal-form";
import { PdvToggle } from "./pdv-toggle";
import { RegenerarButton } from "./regenerar-button";
import { formatCurrency, diasAtrasISO } from "@/lib/utils";

export default async function PdvPage() {
  const { producer } = await requireProducer();
  const supabase = await createClient();

  const { data: terminal } = await supabase
    .from("pdv_terminals")
    .select("id, token_publico, nome_identificacao, ativo, criado_em")
    .eq("producer_id", producer.id)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = terminal ? `${siteUrl}/pdv/${terminal.token_publico}` : null;

  let vendas30dias: { count: number; total: number } = { count: 0, total: 0 };
  if (terminal) {
    const { data: eventos } = await supabase.from("events").select("id").eq("producer_id", producer.id);
    const eventIds = (eventos ?? []).map((e) => e.id);
    if (eventIds.length) {
      const { data: orders } = await supabase
        .from("orders")
        .select("valor_ingressos")
        .in("event_id", eventIds)
        .eq("canal", "pdv")
        .eq("status", "pago")
        .gte("criado_em", diasAtrasISO(30));
      vendas30dias = {
        count: orders?.length ?? 0,
        total: (orders ?? []).reduce((acc, o) => acc + Number(o.valor_ingressos), 0),
      };
    }
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">
          Ponto de venda
        </h1>
        <p className="mt-1 text-xs text-[#93a0b8]">
          Um link só, pra qualquer loja parceira vender ingresso presencial (dinheiro ou
          maquininha própria) e imprimir na hora.
        </p>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        {!terminal ? (
          <CriarTerminalForm />
        ) : (
          <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-[var(--font-sora)] text-base font-bold text-white">
                {terminal.nome_identificacao}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant={terminal.ativo ? "success" : "secondary"}>
                  {terminal.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <PdvToggle id={terminal.id} ativo={terminal.ativo} />
              </div>
            </div>
            <p className="mb-2 break-all rounded-xl border border-[#263041] bg-[#18202e] p-3 text-sm text-white">
              {link}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {link && <CopyLinkButton link={link} />}
              <RegenerarButton terminalId={terminal.id} />
            </div>
            <p className="mt-3 text-xs text-[#5d6b84]">
              Abra o link no computador da loja (conectado à impressora térmica). Não precisa de
              login — a loja escolhe o evento e o lote na hora da venda.
            </p>
          </div>
        )}

        {terminal && (
          <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
            <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">
              Vendas do PDV (últimos 30 dias)
            </h2>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-[#93a0b8]">Pedidos</p>
                <p className="font-[var(--font-sora)] text-xl font-bold text-white">{vendas30dias.count}</p>
              </div>
              <div>
                <p className="text-xs text-[#93a0b8]">Total vendido</p>
                <p className="font-[var(--font-sora)] text-xl font-bold text-[var(--accent)]">
                  {formatCurrency(vendas30dias.total)}
                </p>
              </div>
            </div>
            <Link
              href="/produtor/financeiro?canal=pdv"
              className="mt-3.5 inline-block text-sm font-semibold text-[var(--accent)] underline"
            >
              Ver relatório completo no financeiro
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
