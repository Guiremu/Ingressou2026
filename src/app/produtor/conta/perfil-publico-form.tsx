"use client";

import { useActionState } from "react";
import { atualizarPerfilProdutor, type PerfilPublicoState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CIDADES_ATENDIDAS } from "@/lib/event-defaults";
import type { Producer } from "@/types/database";

const initialState: PerfilPublicoState = {};

export function PerfilPublicoForm({ producer }: { producer: Producer }) {
  const [state, formAction, pending] = useActionState(atualizarPerfilProdutor, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome_fantasia">Nome de exibição</Label>
        <Input id="nome_fantasia" name="nome_fantasia" defaultValue={producer.nome_fantasia ?? ""} placeholder={producer.razao_social} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cidade">Cidade</Label>
        <Select id="cidade" name="cidade" defaultValue={producer.cidade ?? ""}>
          <option value="">Selecione</option>
          {CIDADES_ATENDIDAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao">Sobre (bio pública)</Label>
        <Textarea id="descricao" name="descricao" rows={4} defaultValue={producer.descricao ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logo">Logo (avatar)</Label>
          {producer.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producer.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          )}
          <Input id="logo" name="logo" type="file" accept="image/*" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="banner">Banner</Label>
          {producer.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producer.banner_url} alt="" className="h-20 w-full rounded-2xl object-cover" />
          )}
          <Input id="banner" name="banner" type="file" accept="image/*" />
        </div>
      </div>
      <p className="text-xs text-[var(--text-dim)]">Deixe os campos de imagem em branco pra manter as atuais.</p>

      {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--success)]">{state.success}</p>}

      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Salvando..." : "Salvar perfil público"}
      </Button>
    </form>
  );
}
