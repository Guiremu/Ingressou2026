"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse com seu CPF, e-mail ou telefone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="identifier">CPF, e-mail ou telefone</Label>
              <Input id="identifier" name="identifier" required autoComplete="username" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-white underline">
              Cadastre-se
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
            É organizador de eventos?{" "}
            <Link href="/cadastro/produtor" className="font-medium text-white underline">
              Cadastre-se como produtor
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
