import type { SupabaseClient } from "@supabase/supabase-js";

export interface FinanceiroFiltros {
  evento?: string;
  status?: string;
  de?: string;
  ate?: string;
  canal?: "online" | "pdv";
}

const ORDERS_SELECT =
  "id, comprador_nome, valor_ingressos, valor_total_cobrado, metodo_pagamento, parcelas, status, criado_em, event_id, canal, forma_pagamento_pdv, payment_splits(taxa_mp, taxa_plataforma, valor_liquido_produtor)";

/** Monta a query de `orders` filtrada, reaproveitada pela página e pelo export CSV. */
export function buildOrdersQuery(supabase: SupabaseClient, eventIds: string[], filtros: FinanceiroFiltros) {
  let query = supabase
    .from("orders")
    .select(ORDERS_SELECT)
    .in("event_id", filtros.evento ? [filtros.evento] : eventIds)
    .order("criado_em", { ascending: false });

  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.canal) query = query.eq("canal", filtros.canal);
  if (filtros.de) query = query.gte("criado_em", new Date(filtros.de).toISOString());
  if (filtros.ate) {
    const fim = new Date(filtros.ate);
    fim.setDate(fim.getDate() + 1);
    query = query.lt("criado_em", fim.toISOString());
  }

  return query;
}
