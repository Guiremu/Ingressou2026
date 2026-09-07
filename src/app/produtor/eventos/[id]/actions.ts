"use server";

import { revalidatePath } from "next/cache";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { signTicket } from "@/lib/tickets";
import { onlyDigits, isValidCpf } from "@/lib/utils";
import { CATEGORIAS_EVENTO, CIDADES_ATENDIDAS } from "@/lib/event-defaults";
import type { EventStatus, MotivoCortesia } from "@/types/database";

async function assertOwnsEvent(admin: ReturnType<typeof createAdminClient>, eventId: string, producerId: string) {
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single();
  if (!event || event.producer_id !== producerId) throw new Error("Evento não encontrado.");
  return event;
}

async function assertOwnsLote(admin: ReturnType<typeof createAdminClient>, loteId: string, producerId: string) {
  const { data: lote } = await admin.from("ticket_types").select("*, events!inner(producer_id)").eq("id", loteId).single();
  const producerIdDoLote = (lote?.events as unknown as { producer_id: string } | null)?.producer_id;
  if (!lote || producerIdDoLote !== producerId) throw new Error("Lote não encontrado.");
  return lote;
}

export interface FormState {
  error?: string;
  success?: string;
  codigoQr?: string;
}

export async function atualizarStatusEvento(eventId: string, status: EventStatus): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  if (status === "publicado" && producer.status !== "aprovado") {
    return { error: "Seu cadastro de produtor ainda não foi aprovado — não é possível publicar." };
  }

  const { error } = await admin.from("events").update({ status }).eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: "Status atualizado." };
}

/** Evento em rascunho, nunca publicado, pode ser apagado por completo. */
export async function excluirEvento(eventId: string): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const event = await assertOwnsEvent(admin, eventId, producer.id);

  if (event.status !== "rascunho") {
    return { error: "Só é possível excluir eventos que ainda estão em rascunho." };
  }

  // tickets.event_id não tem cascade — apaga explicitamente antes (cobre eventuais
  // cortesias geradas enquanto o evento ainda era rascunho). ticket_types e validators
  // têm "on delete cascade" a partir de events, então somem junto com o evento.
  await admin.from("tickets").delete().eq("event_id", eventId);
  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  return { success: "Evento excluído." };
}

export async function atualizarEvento(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const eventoAtual = await assertOwnsEvent(admin, eventId, producer.id);

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const local = String(formData.get("local") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const politicaReembolso = String(formData.get("politica_reembolso") ?? "").trim();

  if (!titulo || !local || !cidade || !dataInicio) {
    return { error: "Preencha ao menos título, local, cidade e data de início." };
  }

  if (!CIDADES_ATENDIDAS.includes(cidade)) {
    return { error: "Selecione uma cidade válida da lista." };
  }
  if (categoria && !CATEGORIAS_EVENTO.includes(categoria)) {
    return { error: "Selecione uma categoria válida da lista." };
  }

  const update: Record<string, unknown> = {
    titulo,
    descricao: descricao || null,
    categoria: categoria || null,
    local,
    endereco: endereco || null,
    cidade,
    data_inicio: new Date(dataInicio).toISOString(),
    data_fim: dataFim ? new Date(dataFim).toISOString() : null,
    politica_reembolso: politicaReembolso || null,
  };

  const imagem = formData.get("imagem");
  const temNovaImagem = imagem instanceof File && imagem.size > 0;

  if (!temNovaImagem && !eventoAtual.imagem_url) {
    return { error: "A foto de banner do evento é obrigatória." };
  }

  if (temNovaImagem && imagem instanceof File) {
    const extensao = imagem.name.split(".").pop() || "jpg";
    const caminho = `${producer.id}/${eventId}-${Date.now()}.${extensao}`;
    const { error: uploadError } = await admin.storage
      .from("event-images")
      .upload(caminho, await imagem.arrayBuffer(), { contentType: imagem.type, upsert: true });

    if (uploadError) return { error: "Não foi possível enviar a imagem: " + uploadError.message };

    const { data: publicUrl } = admin.storage.from("event-images").getPublicUrl(caminho);
    update.imagem_url = publicUrl.publicUrl;
  }

  const { error } = await admin.from("events").update(update).eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: "Dados do evento atualizados." };
}

export async function criarLote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const preco = Number(formData.get("preco") ?? 0);
  const quantidadeTotal = Number(formData.get("quantidade_total") ?? 0);
  const maxPorPedido = Number(formData.get("max_por_pedido") ?? 10);
  const dataInicioVenda = String(formData.get("data_inicio_venda") ?? "");
  const dataFimVenda = String(formData.get("data_fim_venda") ?? "");

  if (!nome || preco < 0 || quantidadeTotal < 1) {
    return { error: "Confira nome, preço e quantidade do lote." };
  }

  const { count } = await admin
    .from("ticket_types")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("tipo", "pago");

  const { error } = await admin.from("ticket_types").insert({
    event_id: eventId,
    nome,
    descricao: descricao || null,
    preco,
    quantidade_total: quantidadeTotal,
    max_por_pedido: maxPorPedido || 10,
    data_inicio_venda: dataInicioVenda ? new Date(dataInicioVenda).toISOString() : null,
    data_fim_venda: dataFimVenda ? new Date(dataFimVenda).toISOString() : null,
    tipo: "pago",
    ordem: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: "Lote criado." };
}

export async function atualizarLote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const loteId = String(formData.get("lote_id") ?? "");
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const lote = await assertOwnsLote(admin, loteId, producer.id);

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const preco = Number(formData.get("preco") ?? 0);
  const quantidadeTotal = Number(formData.get("quantidade_total") ?? 0);
  const maxPorPedido = Number(formData.get("max_por_pedido") ?? 10);
  const dataInicioVenda = String(formData.get("data_inicio_venda") ?? "");
  const dataFimVenda = String(formData.get("data_fim_venda") ?? "");

  if (!nome || preco < 0 || quantidadeTotal < 1) {
    return { error: "Confira nome, preço e quantidade do lote." };
  }

  if (quantidadeTotal < lote.quantidade_vendida) {
    return {
      error: `A quantidade não pode ficar abaixo do que já foi vendido (${lote.quantidade_vendida} unidades).`,
    };
  }

  const { error } = await admin
    .from("ticket_types")
    .update({
      nome,
      descricao: descricao || null,
      preco,
      quantidade_total: quantidadeTotal,
      max_por_pedido: maxPorPedido || 10,
      data_inicio_venda: dataInicioVenda ? new Date(dataInicioVenda).toISOString() : null,
      data_fim_venda: dataFimVenda ? new Date(dataFimVenda).toISOString() : null,
    })
    .eq("id", loteId);

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${lote.event_id}`);
  return { success: "Lote atualizado." };
}

export async function alternarLote(loteId: string, ativo: boolean): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const lote = await assertOwnsLote(admin, loteId, producer.id);

  await admin.from("ticket_types").update({ ativo }).eq("id", loteId);
  revalidatePath(`/produtor/eventos/${lote.event_id}`);
  return { success: ativo ? "Lote reativado." : "Lote pausado." };
}

export async function excluirLote(loteId: string): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const lote = await assertOwnsLote(admin, loteId, producer.id);

  if (lote.quantidade_vendida > 0) {
    return { error: "Não é possível excluir um lote que já teve ingressos vendidos. Pause-o em vez disso." };
  }

  const { error } = await admin.from("ticket_types").delete().eq("id", loteId);
  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${lote.event_id}`);
  return { success: "Lote excluído." };
}

export async function duplicarLote(loteId: string): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const lote = await assertOwnsLote(admin, loteId, producer.id);

  const { count } = await admin
    .from("ticket_types")
    .select("*", { count: "exact", head: true })
    .eq("event_id", lote.event_id)
    .eq("tipo", "pago");

  const { error } = await admin.from("ticket_types").insert({
    event_id: lote.event_id,
    nome: `${lote.nome} (cópia)`,
    descricao: lote.descricao,
    preco: lote.preco,
    quantidade_total: lote.quantidade_total,
    max_por_pedido: lote.max_por_pedido,
    data_inicio_venda: lote.data_inicio_venda,
    data_fim_venda: lote.data_fim_venda,
    tipo: "pago",
    ordem: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${lote.event_id}`);
  return { success: "Lote duplicado." };
}

/** Troca a ordem de exibição entre um lote e seu vizinho (acima/abaixo) na lista pública. */
export async function reordenarLote(loteId: string, direcao: "up" | "down"): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  const lote = await assertOwnsLote(admin, loteId, producer.id);

  const { data: lotes } = await admin
    .from("ticket_types")
    .select("id, ordem")
    .eq("event_id", lote.event_id)
    .eq("tipo", "pago")
    .order("ordem", { ascending: true });

  const ordenados = lotes ?? [];
  const index = ordenados.findIndex((l) => l.id === loteId);
  const vizinhoIndex = direcao === "up" ? index - 1 : index + 1;
  if (index === -1 || vizinhoIndex < 0 || vizinhoIndex >= ordenados.length) return {};

  const atual = ordenados[index];
  const vizinho = ordenados[vizinhoIndex];

  await Promise.all([
    admin.from("ticket_types").update({ ordem: vizinho.ordem }).eq("id", atual.id),
    admin.from("ticket_types").update({ ordem: atual.ordem }).eq("id", vizinho.id),
  ]);

  revalidatePath(`/produtor/eventos/${lote.event_id}`);
  return {};
}

/** Cortesias são geradas uma de cada vez — cada uma tem seu próprio titular. */
export async function gerarCortesia(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer, profile } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  const motivo = String(formData.get("motivo") ?? "outro") as MotivoCortesia;
  const titularNome = String(formData.get("titular_nome") ?? "").trim();
  const titularCpf = onlyDigits(String(formData.get("titular_cpf") ?? ""));
  const intransferivel = String(formData.get("intransferivel") ?? "") === "1";

  if (intransferivel && (!titularNome || !isValidCpf(titularCpf))) {
    return { error: "Cortesia intransferível exige nome e CPF válido do titular." };
  }
  if (titularCpf && !isValidCpf(titularCpf)) {
    return { error: "Informe um CPF válido para o titular (ou deixe em branco)." };
  }

  let { data: cortesiaLote } = await admin
    .from("ticket_types")
    .select("id")
    .eq("event_id", eventId)
    .eq("tipo", "cortesia")
    .maybeSingle();

  if (!cortesiaLote) {
    const { data: novoLote, error: loteError } = await admin
      .from("ticket_types")
      .insert({
        event_id: eventId,
        nome: "Cortesia",
        preco: 0,
        quantidade_total: 1000000,
        max_por_pedido: 1000000,
        tipo: "cortesia",
      })
      .select("id")
      .single();
    if (loteError || !novoLote) return { error: "Não foi possível preparar o lote de cortesias." };
    cortesiaLote = novoLote;
  }

  // Se o CPF bater com uma conta já cadastrada, o ingresso já nasce vinculado a ela
  // (aparece direto em "Meus ingressos" da pessoa). Sem conta, fica só na listagem —
  // o produtor pode vincular depois manualmente.
  let vinculadoProfileId: string | null = null;
  if (isValidCpf(titularCpf)) {
    const { data: perfilEncontrado } = await admin.from("profiles").select("id").eq("cpf", titularCpf).maybeSingle();
    vinculadoProfileId = perfilEncontrado?.id ?? null;
  }

  const codigoQr = randomUUID();
  const { error } = await admin.from("tickets").insert({
    ticket_type_id: cortesiaLote.id,
    event_id: eventId,
    codigo_qr: codigoQr,
    assinatura_hmac: signTicket(codigoQr, eventId),
    is_cortesia: true,
    motivo_cortesia: motivo,
    titular_nome: titularNome || null,
    titular_cpf: titularCpf || null,
    intransferivel,
    profile_id: vinculadoProfileId,
    gerado_por: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return {
    success: vinculadoProfileId
      ? "Ingresso cortesia gerado e vinculado à conta do titular."
      : "Ingresso cortesia gerado. Esse CPF ainda não tem conta — vincule depois se quiser.",
    codigoQr,
  };
}

/** Vincula (ou revincula) um ingresso já existente à conta de um CPF cadastrado. */
export async function transferirIngresso(_prevState: FormState, formData: FormData): Promise<FormState> {
  const ticketId = String(formData.get("ticket_id") ?? "");
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  if (!isValidCpf(cpf)) return { error: "Informe um CPF válido." };

  const { data: ticket } = await admin.from("tickets").select("*, events!inner(producer_id)").eq("id", ticketId).single();
  const producerIdDoTicket = (ticket?.events as unknown as { producer_id: string } | null)?.producer_id;
  if (!ticket || producerIdDoTicket !== producer.id) return { error: "Ingresso não encontrado." };

  const { data: perfil } = await admin.from("profiles").select("id, nome").eq("cpf", cpf).maybeSingle();
  if (!perfil) return { error: "Nenhuma conta encontrada com esse CPF." };

  const { error } = await admin
    .from("tickets")
    .update({ profile_id: perfil.id, titular_cpf: cpf, titular_nome: ticket.titular_nome ?? perfil.nome })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${ticket.event_id}`);
  return { success: `Ingresso vinculado à conta de ${perfil.nome}.` };
}

/** Cancela uma cortesia já gerada — mantém o histórico, só invalida pra check-in. */
export async function cancelarCortesia(ticketId: string): Promise<FormState> {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const { data: ticket } = await admin.from("tickets").select("*, events!inner(producer_id)").eq("id", ticketId).single();
  const producerIdDoTicket = (ticket?.events as unknown as { producer_id: string } | null)?.producer_id;
  if (!ticket || producerIdDoTicket !== producer.id || !ticket.is_cortesia) {
    return { error: "Cortesia não encontrada." };
  }
  if (ticket.status === "cancelado") return { error: "Essa cortesia já está cancelada." };
  if (ticket.status === "usado") {
    return { error: "Essa cortesia já foi validada na portaria — não é possível cancelar." };
  }

  const { error } = await admin.from("tickets").update({ status: "cancelado" }).eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${ticket.event_id}/cortesias`);
  return { success: "Cortesia cancelada." };
}

export async function criarValidator(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  const nomeIdentificacao = String(formData.get("nome_identificacao") ?? "").trim();
  const expiraEm = String(formData.get("expira_em") ?? "");

  if (!nomeIdentificacao) return { error: "Informe um nome de identificação para o colaborador." };

  const { error } = await admin.from("validators").insert({
    event_id: eventId,
    producer_id: producer.id,
    nome_identificacao: nomeIdentificacao,
    token_publico: randomUUID(),
    expira_em: expiraEm ? new Date(expiraEm).toISOString() : null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: "Colaborador criado." };
}

export async function alternarValidator(validatorId: string, ativo: boolean) {
  const { producer } = await requireProducer();
  const admin = createAdminClient();

  const { data: validator } = await admin
    .from("validators")
    .select("id, producer_id, event_id")
    .eq("id", validatorId)
    .single();

  if (!validator || validator.producer_id !== producer.id) throw new Error("Não autorizado.");

  await admin.from("validators").update({ ativo }).eq("id", validatorId);
  revalidatePath(`/produtor/eventos/${validator.event_id}`);
}
