"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePaidOrder } from "@/lib/orders";
import { signPrintToken } from "@/lib/tickets";
import { isValidCpf, onlyDigits } from "@/lib/utils";

export interface PdvSaleState {
  error?: string;
  tickets?: { codigoQr: string; printUrl: string }[];
}

interface ItemSelecionado {
  ticketTypeId: string;
  quantidade: number;
}

const FORMAS_VALIDAS = ["dinheiro", "debito", "credito", "pix"] as const;
type FormaPagamentoUnica = (typeof FORMAS_VALIDAS)[number];

interface PagamentoSelecionado {
  forma_pagamento: FormaPagamentoUnica;
  valor: number;
}

const PRINT_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Lotes vendáveis de um evento — reusado pelo terminal ao trocar de evento (revalida o token). */
export async function listarLotesDoEvento(token: string, eventId: string) {
  const admin = createAdminClient();

  const { data: terminal } = await admin
    .from("pdv_terminals")
    .select("id, producer_id, ativo")
    .eq("token_publico", token)
    .maybeSingle();

  if (!terminal || !terminal.ativo) return { error: "Link de PDV inválido ou desativado." };

  const { data: event } = await admin.from("events").select("id, producer_id, status").eq("id", eventId).single();
  if (!event || event.producer_id !== terminal.producer_id || event.status !== "publicado") {
    return { error: "Evento não encontrado." };
  }

  const { data: ticketTypes } = await admin
    .from("ticket_types")
    .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida")
    .eq("event_id", eventId)
    .eq("ativo", true)
    .eq("tipo", "pago")
    .order("ordem");

  return { ticketTypes: ticketTypes ?? [] };
}

/** Registra uma venda presencial do PDV — mesma lógica de `criarPedido` no ramo gratuito, sem MP. */
export async function criarVendaPdv(_prevState: PdvSaleState, formData: FormData): Promise<PdvSaleState> {
  const token = String(formData.get("token") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const compradorNome = String(formData.get("comprador_nome") ?? "").trim();
  const compradorCpfDigits = onlyDigits(String(formData.get("comprador_cpf") ?? ""));

  let itens: ItemSelecionado[] = [];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { error: "Carrinho inválido." };
  }
  itens = itens.filter((i) => i.quantidade > 0);

  let pagamentos: PagamentoSelecionado[] = [];
  try {
    pagamentos = JSON.parse(String(formData.get("pagamentos") ?? "[]"));
  } catch {
    return { error: "Pagamento inválido." };
  }
  pagamentos = pagamentos.filter((p) => p.valor > 0);

  if (itens.length === 0) return { error: "Selecione ao menos um ingresso." };
  if (pagamentos.length === 0) return { error: "Informe ao menos uma forma de pagamento." };
  if (pagamentos.some((p) => !FORMAS_VALIDAS.includes(p.forma_pagamento))) {
    return { error: "Forma de pagamento inválida." };
  }
  if (compradorCpfDigits && !isValidCpf(compradorCpfDigits)) {
    return { error: "CPF do comprador inválido (ou deixe em branco)." };
  }

  const admin = createAdminClient();

  const { data: terminal } = await admin
    .from("pdv_terminals")
    .select("id, producer_id, ativo")
    .eq("token_publico", token)
    .maybeSingle();

  if (!terminal || !terminal.ativo) return { error: "Link de PDV inválido ou desativado." };

  const { data: event } = await admin.from("events").select("id, titulo, status, producer_id").eq("id", eventId).single();
  if (!event || event.producer_id !== terminal.producer_id || event.status !== "publicado") {
    return { error: "Evento não encontrado." };
  }

  const { data: ticketTypes } = await admin
    .from("ticket_types")
    .select("id, nome, preco, max_por_pedido, quantidade_total, quantidade_vendida, ativo")
    .eq("event_id", eventId)
    .in(
      "id",
      itens.map((i) => i.ticketTypeId),
    );

  if (!ticketTypes || ticketTypes.length !== itens.length) {
    return { error: "Um ou mais lotes não foram encontrados." };
  }

  const loteInativo = ticketTypes.find((t) => !t.ativo);
  if (loteInativo) return { error: `O lote "${loteInativo.nome}" não está mais disponível para venda.` };

  const reservados: ItemSelecionado[] = [];
  async function liberarTudo() {
    for (const r of reservados) {
      await admin.rpc("release_ticket_stock", { p_ticket_type_id: r.ticketTypeId, p_quantidade: r.quantidade });
    }
  }

  for (const item of itens) {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    if (item.quantidade > tt.max_por_pedido) {
      await liberarTudo();
      return { error: `Máximo de ${tt.max_por_pedido} ingressos por pedido para o lote "${tt.nome}".` };
    }

    const reserved = await admin.rpc("reserve_ticket_stock", {
      p_ticket_type_id: item.ticketTypeId,
      p_quantidade: item.quantidade,
    });

    if (!reserved.data) {
      await liberarTudo();
      return { error: `Ingressos insuficientes disponíveis no lote "${tt.nome}".` };
    }
    reservados.push(item);
  }

  const valorIngressos = itens.reduce((acc, item) => {
    const tt = ticketTypes.find((t) => t.id === item.ticketTypeId)!;
    return acc + Number(tt.preco) * item.quantidade;
  }, 0);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  if (Math.abs(totalPago - valorIngressos) > 0.01) {
    await liberarTudo();
    return { error: "A soma das formas de pagamento não bate com o total da venda." };
  }

  const formaPagamentoResumo = pagamentos.length > 1 ? "misto" : pagamentos[0].forma_pagamento;

  // CPF opcional: se bater com uma conta já cadastrada, os ingressos já nascem
  // vinculados a ela (mesmo padrão de auto-vínculo usado nas cortesias).
  let perfilVinculado: { id: string } | null = null;
  if (compradorCpfDigits) {
    const { data: perfil } = await admin.from("profiles").select("id").eq("cpf", compradorCpfDigits).maybeSingle();
    perfilVinculado = perfil ?? null;
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      event_id: eventId,
      profile_id: null,
      comprador_nome: compradorNome || "Venda PDV",
      comprador_email: "",
      comprador_cpf: compradorCpfDigits,
      comprador_telefone: null,
      valor_ingressos: valorIngressos,
      valor_taxa_parcelamento: 0,
      valor_total_cobrado: valorIngressos,
      metodo_pagamento: "gratuito",
      parcelas: 1,
      status: "pendente",
      canal: "pdv",
      forma_pagamento_pdv: formaPagamentoResumo,
      pdv_terminal_id: terminal.id,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    await liberarTudo();
    return { error: "Não foi possível criar a venda: " + orderError?.message };
  }

  await admin.from("order_items").insert(
    itens.map((item) => ({
      order_id: order.id,
      ticket_type_id: item.ticketTypeId,
      quantidade: item.quantidade,
      preco_unitario: Number(ticketTypes.find((t) => t.id === item.ticketTypeId)!.preco),
    })),
  );

  await admin.from("payment_splits").insert({
    order_id: order.id,
    valor_bruto: valorIngressos,
    taxa_mp: 0,
    taxa_plataforma: 0,
    valor_liquido_produtor: valorIngressos,
  });

  await admin.from("pdv_order_payments").insert(
    pagamentos.map((p) => ({
      order_id: order.id,
      forma_pagamento: p.forma_pagamento,
      valor: p.valor,
    })),
  );

  await finalizePaidOrder(order.id, null);

  if (perfilVinculado) {
    await admin.from("tickets").update({ profile_id: perfilVinculado.id }).eq("order_id", order.id);
  }

  const { data: tickets } = await admin.from("tickets").select("codigo_qr").eq("order_id", order.id);

  const expiresAt = Date.now() + PRINT_TOKEN_TTL_MS;
  const resultado = (tickets ?? []).map((t) => ({
    codigoQr: t.codigo_qr,
    printUrl: `/pdv/imprimir/${t.codigo_qr}?pt=${signPrintToken(t.codigo_qr, expiresAt)}`,
  }));

  return { tickets: resultado };
}
