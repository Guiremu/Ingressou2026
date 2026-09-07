"use client";

import { useActionState, useState } from "react";
import { atualizarEvento, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POLITICA_REEMBOLSO_PADRAO } from "@/lib/event-defaults";
import type { EventRow } from "@/types/database";

const initialState: FormState = {};

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function EventEditForm({ event }: { event: EventRow }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pending] = useActionState(atualizarEvento, initialState);

  if (!aberto) {
    return (
      <Button type="button" variant="outline" onClick={() => setAberto(true)}>
        Editar dados do evento
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      <input type="hidden" name="event_id" value={event.id} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" defaultValue={event.titulo} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" name="descricao" defaultValue={event.descricao ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" name="categoria" defaultValue={event.categoria ?? ""} placeholder="Show, Festa, Teatro..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" name="cidade" defaultValue={event.cidade ?? ""} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="local">Local</Label>
        <Input id="local" name="local" defaultValue={event.local ?? ""} required placeholder="Nome do espaço" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" name="endereco" defaultValue={event.endereco ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="data_inicio">Data/hora de início</Label>
          <Input
            id="data_inicio"
            name="data_inicio"
            type="datetime-local"
            defaultValue={toInputDateTime(event.data_inicio)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="data_fim">Data/hora de fim</Label>
          <Input id="data_fim" name="data_fim" type="datetime-local" defaultValue={toInputDateTime(event.data_fim)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="imagem">Imagem de capa</Label>
        {event.imagem_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imagem_url} alt="" className="h-32 w-full rounded-lg object-cover" />
        )}
        <Input id="imagem" name="imagem" type="file" accept="image/*" />
        <p className="text-xs text-[var(--text-dim)]">Deixe em branco pra manter a imagem atual.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="politica_reembolso">Política de reembolso</Label>
        <Textarea
          id="politica_reembolso"
          name="politica_reembolso"
          rows={6}
          defaultValue={event.politica_reembolso ?? POLITICA_REEMBOLSO_PADRAO}
        />
        <p className="text-xs text-[var(--text-dim)]">
          Já vem preenchida com o padrão da plataforma — edite se seu evento tiver uma regra diferente. Isso aparece
          na página pública do evento.
        </p>
      </div>

      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--success)]">{state.success}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </div>
    </form>
  );
}
