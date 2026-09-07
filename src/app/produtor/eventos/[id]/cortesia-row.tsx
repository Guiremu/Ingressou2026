"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cancelarCortesia } from "./actions";
import { TransferirForm } from "./transferir-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/produtor/copy-link-button";
import type { Ticket } from "@/types/database";

const motivoLabel = { funcionario: "Funcionário", amigo: "Amigo", patrocinador: "Patrocinador", outro: "Outro" };

export function CortesiaRow({ cortesia: c }: { cortesia: Ticket }) {
  const [expandido, setExpandido] = useState(false);
  const [pending, startTransition] = useTransition();

  const link = typeof window !== "undefined" ? `${window.location.origin}/ingresso/${c.codigo_qr}` : `/ingresso/${c.codigo_qr}`;

  function excluir() {
    if (!window.confirm("Cancelar esta cortesia? O ingresso deixa de valer na portaria.")) return;
    startTransition(async () => {
      const result = await cancelarCortesia(c.id);
      if (result.error) alert(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-[#263041] bg-[#18202e] p-3.5">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="break-words font-medium text-white">
            {c.titular_nome ?? "Sem nome definido"}{" "}
            {c.intransferivel && <Badge variant="warning">intransferível</Badge>}
            {c.profile_id && <Badge variant="success">conta vinculada</Badge>}
          </p>
          <p className="break-words text-sm text-[#93a0b8]">
            {motivoLabel[c.motivo_cortesia ?? "outro"]}
            {c.titular_cpf && ` · CPF ${c.titular_cpf}`}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge variant={c.status === "usado" ? "secondary" : c.status === "cancelado" ? "destructive" : "success"}>
            {c.status}
          </Badge>
          <ChevronDown className={`h-4 w-4 text-[#93a0b8] transition-transform ${expandido ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expandido && (
        <div className="flex flex-col gap-3 border-t border-[#263041] pt-3">
          {!c.profile_id && <TransferirForm ticketId={c.id} />}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5d6b84]">Enviar novamente</p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/ingresso/${c.codigo_qr}`} target="_blank" className="text-xs font-medium text-[var(--accent)] underline">
                Ver ingresso
              </Link>
              <a href={`/ingresso/${c.codigo_qr}/pdf`} className="text-xs font-medium text-[var(--accent)] underline">
                Baixar PDF
              </a>
              <a href={`/ingresso/${c.codigo_qr}/imagem`} className="text-xs font-medium text-[var(--accent)] underline">
                Baixar imagem
              </a>
              <CopyLinkButton link={link} />
            </div>
          </div>

          {c.status === "usado" ? (
            <p className="text-xs text-[#5d6b84]">Já foi validado na portaria — não é possível cancelar.</p>
          ) : c.status === "cancelado" ? (
            <p className="text-xs text-[#5d6b84]">Cortesia cancelada.</p>
          ) : (
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={excluir} className="self-start">
              Excluir
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
