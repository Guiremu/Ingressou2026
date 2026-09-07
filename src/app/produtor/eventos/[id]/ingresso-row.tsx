"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statusVariant = { valido: "success", usado: "secondary", cancelado: "destructive" } as const;
const formaPagamentoPdvLabel = { dinheiro: "Dinheiro", debito: "Débito", credito: "Crédito", pix: "PIX", misto: "Misto" } as const;

type OrderInfo = {
  comprador_nome: string;
  comprador_email: string;
  comprador_telefone: string | null;
  comprador_cpf: string;
  canal: string;
  forma_pagamento_pdv: string | null;
  criado_em: string;
  pdv_terminals: { nome_identificacao: string } | null;
} | null;

interface IngressoTicket {
  id: string;
  codigo_qr: string;
  status: string;
  titular_nome: string | null;
  titular_cpf: string | null;
  intransferivel: boolean;
  profile_id: string | null;
  usado_em: string | null;
  criado_em: string;
  impresso_count: number;
  impresso_em: string | null;
  ultima_impressao_em: string | null;
  ticket_types: unknown;
  orders: unknown;
}

export function IngressoRow({ ticket: t }: { ticket: IngressoTicket }) {
  const [expandido, setExpandido] = useState(false);
  const order = t.orders as unknown as OrderInfo;
  const tipo = t.ticket_types as unknown as { nome: string } | null;

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5 text-sm">
      <button type="button" onClick={() => setExpandido((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="break-words font-medium text-white">
            {t.titular_nome ?? order?.comprador_nome ?? "Comprador"}{" "}
            {t.intransferivel && <Badge variant="warning">intransferível</Badge>}
            {t.profile_id && <Badge variant="success">conta vinculada</Badge>}
            {t.impresso_count > 1 && <Badge variant="destructive">impresso {t.impresso_count}x</Badge>}
          </p>
          <p className="break-words text-[#93a0b8]">
            {tipo?.nome} — {order?.comprador_email ?? "—"}
          </p>
          <p className="break-all text-xs text-[#5d6b84]">{t.codigo_qr}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <div className="text-right">
            <Badge variant={statusVariant[t.status as keyof typeof statusVariant]}>{t.status}</Badge>
            {t.usado_em && <p className="mt-1 text-xs text-[#5d6b84]">{formatDate(t.usado_em)}</p>}
          </div>
          <ChevronDown className={`h-4 w-4 text-[#93a0b8] transition-transform ${expandido ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expandido && (
        <div className="grid grid-cols-1 gap-3 border-t border-[#263041] pt-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Comprador</p>
            <p className="text-[#c7d0e0]">Telefone: {order?.comprador_telefone ?? "—"}</p>
            <p className="text-[#c7d0e0]">CPF: {t.titular_cpf ?? order?.comprador_cpf ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Compra</p>
            <p className="text-[#c7d0e0]">Data: {formatDate(order?.criado_em ?? t.criado_em)}</p>
            <p className="text-[#c7d0e0]">Canal: {order?.canal === "pdv" ? "PDV" : "Site"}</p>
            <p className="text-[#c7d0e0]">
              Pagamento:{" "}
              {order?.canal === "pdv"
                ? (formaPagamentoPdvLabel[order.forma_pagamento_pdv as keyof typeof formaPagamentoPdvLabel] ?? "—")
                : "Site"}
            </p>
            {order?.canal === "pdv" && order.pdv_terminals && (
              <p className="text-[#c7d0e0]">Emitido por: {order.pdv_terminals.nome_identificacao}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Impressão</p>
            <p className="text-[#c7d0e0]">Vezes impresso: {t.impresso_count}</p>
            {t.impresso_em && <p className="text-[#c7d0e0]">Primeira: {formatDate(t.impresso_em)}</p>}
            {t.ultima_impressao_em && t.ultima_impressao_em !== t.impresso_em && (
              <p className="text-[#c7d0e0]">Última: {formatDate(t.ultima_impressao_em)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
