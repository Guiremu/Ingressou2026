"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";

const initialState: SignupState = {};

export function CadastroForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cpf">CPF</Label>
          <MaskedInput mask="cpf" id="cpf" name="cpf" required placeholder="000.000.000-00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <MaskedInput mask="telefone" id="telefone" name="telefone" placeholder="(00) 00000-0000" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-white underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
