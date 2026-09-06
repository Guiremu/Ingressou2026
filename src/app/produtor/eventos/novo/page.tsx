"use client";

import { useActionState } from "react";
import { criarEvento, type NovoEventoState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: NovoEventoState = {};

export default function NovoEventoPage() {
  const [state, formAction, pending] = useActionState(criarEvento, initialState);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Novo evento</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" name="categoria" placeholder="Show, Festa, Teatro..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="local">Local</Label>
            <Input id="local" name="local" required placeholder="Nome do espaço" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_inicio">Data/hora de início</Label>
              <Input id="data_inicio" name="data_inicio" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data_fim">Data/hora de fim</Label>
              <Input id="data_fim" name="data_fim" type="datetime-local" />
            </div>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Criando..." : "Criar evento (rascunho)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
