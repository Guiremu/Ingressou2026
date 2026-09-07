"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";

  return (
    <>
      {redirectTo && (
        <p className="mb-4 text-center text-sm text-[var(--text-muted-2)]">Entre para continuar sua compra.</p>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identifier">CPF, e-mail ou telefone</Label>
          <Input
            id="identifier"
            name="identifier"
            required
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
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
    </>
  );
}
