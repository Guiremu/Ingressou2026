"use client";

import { useActionState } from "react";
import { atualizarEvento, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { POLITICA_REEMBOLSO_PADRAO, CATEGORIAS_EVENTO, CIDADES_ATENDIDAS } from "@/lib/event-defaults";
import type { EventRow } from "@/types/database";

const initialState: FormState = {};

function toInputDateTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function EventEditForm({ event }: { event: EventRow }) {
  const [state, formAction, pending] = useActionState(atualizarEvento, initialState);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <Select id="categoria" name="categoria" defaultValue={event.categoria ?? ""}>
            <option value="">Selecione</option>
            {CATEGORIAS_EVENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cidade">Cidade</Label>
          <Select id="cidade" name="cidade" required defaultValue={event.cidade ?? ""}>
            <option value="" disabled>
              Selecione
            </option>
            {CIDADES_ATENDIDAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Input id="imagem" name="imagem" type="file" accept="image/*" required={!event.imagem_url} />
        <p className="text-xs text-[var(--text-dim)]">
          {event.imagem_url ? "Deixe em branco pra manter a imagem atual." : "Obrigatória — esse evento ainda não tem foto de banner."}
        </p>
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

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
