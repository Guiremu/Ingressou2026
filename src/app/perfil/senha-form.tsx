"use client";

import { useActionState } from "react";
import { trocarSenha, type PerfilState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: PerfilState = {};

export function SenhaForm() {
  const [state, formAction, pending] = useActionState(trocarSenha, initialState);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova_senha">Nova senha</Label>
            <Input id="nova_senha" name="nova_senha" type="password" minLength={6} required autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacao">Confirmar nova senha</Label>
            <Input id="confirmacao" name="confirmacao" type="password" minLength={6} required autoComplete="new-password" />
          </div>
          {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
          {state.success && <p className="text-sm text-[var(--success)]">{state.success}</p>}
          <Button type="submit" disabled={pending} className="mt-1 self-start">
            {pending ? "Salvando..." : "Atualizar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
