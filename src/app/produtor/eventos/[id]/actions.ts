"use server";

import { revalidatePath } from "next/cache";
import { requireProducer } from "@/lib/producer";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { signTicket } from "@/lib/tickets";
import type { EventStatus, MotivoCortesia } from "@/types/database";

async function assertOwnsEvent(admin: ReturnType<typeof createAdminClient>, eventId: string, producerId: string) {
  const { data: event } = await admin.from("events").select("id, producer_id").eq("id", eventId).single();
  if (!event || event.producer_id !== producerId) throw new Error("Evento não encontrado.");
  return event;
}

export interface FormState {
  error?: string;
  success?: string;
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

export async function criarLote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Number(formData.get("preco") ?? 0);
  const quantidadeTotal = Number(formData.get("quantidade_total") ?? 0);
  const maxPorPedido = Number(formData.get("max_por_pedido") ?? 10);
  const dataInicioVenda = String(formData.get("data_inicio_venda") ?? "");
  const dataFimVenda = String(formData.get("data_fim_venda") ?? "");

  if (!nome || preco < 0 || quantidadeTotal < 1) {
    return { error: "Confira nome, preço e quantidade do lote." };
  }

  const { error } = await admin.from("ticket_types").insert({
    event_id: eventId,
    nome,
    preco,
    quantidade_total: quantidadeTotal,
    max_por_pedido: maxPorPedido || 10,
    data_inicio_venda: dataInicioVenda ? new Date(dataInicioVenda).toISOString() : null,
    data_fim_venda: dataFimVenda ? new Date(dataFimVenda).toISOString() : null,
    tipo: "pago",
  });

  if (error) return { error: error.message };

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: "Lote criado." };
}

export async function gerarCortesias(_prevState: FormState, formData: FormData): Promise<FormState> {
  const eventId = String(formData.get("event_id") ?? "");
  const { producer, profile } = await requireProducer();
  const admin = createAdminClient();
  await assertOwnsEvent(admin, eventId, producer.id);

  const quantidade = Number(formData.get("quantidade") ?? 0);
  const motivo = String(formData.get("motivo") ?? "outro") as MotivoCortesia;

  if (quantidade < 1) return { error: "Informe uma quantidade válida." };

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

  for (let i = 0; i < quantidade; i++) {
    const codigoQr = randomUUID();
    await admin.from("tickets").insert({
      ticket_type_id: cortesiaLote.id,
      event_id: eventId,
      codigo_qr: codigoQr,
      assinatura_hmac: signTicket(codigoQr, eventId),
      is_cortesia: true,
      motivo_cortesia: motivo,
      gerado_por: profile.id,
    });
  }

  revalidatePath(`/produtor/eventos/${eventId}`);
  return { success: `${quantidade} ingresso(s) cortesia gerado(s).` };
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
