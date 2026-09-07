"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  atualizarLote,
  alternarLote,
  excluirLote,
  duplicarLote,
  reordenarLote,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { TicketType } from "@/types/database";

const initialState: FormState = {};

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function LoteRow({
  lote,
  isFirst,
  isLast,
}: {
  lote: TicketType;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [state, formAction, pending] = useActionState(atualizarLote, initialState);
  const [pendingAcao, startTransition] = useTransition();

  function acao(fn: () => Promise<FormState>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    startTransition(async () => {
      const result = await fn();
      if (result.error) alert(result.error);
    });
  }

  if (editando) {
    return (
      <form
        action={(fd) => {
          fd.set("lote_id", lote.id);
          formAction(fd);
        }}
        className="flex flex-col gap-3 rounded-[14px] border border-[#263041] bg-[#18202e] p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`nome-${lote.id}`}>Nome do lote</Label>
            <Input id={`nome-${lote.id}`} name="nome" defaultValue={lote.nome} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`preco-${lote.id}`}>Preço (R$)</Label>
            <Input
              id={`preco-${lote.id}`}
              name="preco"
              type="number"
              step="0.01"
              min="0"
              defaultValue={lote.preco}
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`descricao-${lote.id}`}>Descrição (opcional)</Label>
          <Input id={`descricao-${lote.id}`} name="descricao" defaultValue={lote.descricao ?? ""} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`qtd-${lote.id}`}>
              Quantidade total {lote.quantidade_vendida > 0 && `(mín. ${lote.quantidade_vendida}, já vendidos)`}
            </Label>
            <Input
              id={`qtd-${lote.id}`}
              name="quantidade_total"
              type="number"
              min={lote.quantidade_vendida || 1}
              defaultValue={lote.quantidade_total}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`max-${lote.id}`}>Máx. por pedido</Label>
            <Input id={`max-${lote.id}`} name="max_por_pedido" type="number" min="1" defaultValue={lote.max_por_pedido} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`inicio-${lote.id}`}>Início das vendas</Label>
            <Input
              id={`inicio-${lote.id}`}
              name="data_inicio_venda"
              type="datetime-local"
              defaultValue={toInputDateTime(lote.data_inicio_venda)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`fim-${lote.id}`}>Fim das vendas</Label>
            <Input
              id={`fim-${lote.id}`}
              name="data_fim_venda"
              type="datetime-local"
              defaultValue={toInputDateTime(lote.data_fim_venda)}
            />
          </div>
        </div>
        {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="break-words font-medium text-white">
            {lote.nome} {!lote.ativo && <Badge variant="secondary">pausado</Badge>}
          </p>
          <p className="text-sm text-[#93a0b8]">{formatCurrency(Number(lote.preco))}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <p className="text-sm text-[#93a0b8]">
            {lote.quantidade_vendida} / {lote.quantidade_total} vendidos
          </p>
          <ChevronDown className={`h-4 w-4 text-[#93a0b8] transition-transform ${expandido ? "rotate-180" : ""}`} />
        </div>
      </button>
      {expandido && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando(true)}>
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingAcao}
            onClick={() => acao(() => alternarLote(lote.id, !lote.ativo))}
          >
            {lote.ativo ? "Pausar" : "Reativar"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pendingAcao} onClick={() => acao(() => duplicarLote(lote.id))}>
            Duplicar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingAcao || isFirst}
            onClick={() => acao(() => reordenarLote(lote.id, "up"))}
          >
            ↑
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingAcao || isLast}
            onClick={() => acao(() => reordenarLote(lote.id, "down"))}
          >
            ↓
          </Button>
          {lote.quantidade_vendida === 0 && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pendingAcao}
              onClick={() => acao(() => excluirLote(lote.id), "Excluir este lote? Essa ação não pode ser desfeita.")}
            >
              Excluir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
