"use client";

import { useActionState } from "react";
import { atualizarPerfil, type PerfilState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: PerfilState = {};

export function PerfilForm({
  nome,
  telefone,
  email,
  cpf,
}: {
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
}) {
  const [state, formAction, pending] = useActionState(atualizarPerfil, initialState);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Dados pessoais</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" defaultValue={nome} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={telefone} inputMode="tel" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>CPF</Label>
            <Input value={cpf} disabled />
          </div>
          {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
          {state.success && <p className="text-sm text-[var(--success)]">{state.success}</p>}
          <Button type="submit" disabled={pending} className="mt-1 self-start">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
