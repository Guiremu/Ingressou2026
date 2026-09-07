"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupProdutor, type ProdutorSignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const initialState: ProdutorSignupState = {};

export function ProdutorForm() {
  const [state, formAction, pending] = useActionState(signupProdutor, initialState);
  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">("fisica");

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipo_pessoa">Tipo de pessoa</Label>
          <Select
            id="tipo_pessoa"
            name="tipo_pessoa"
            value={tipoPessoa}
            onChange={(e) => setTipoPessoa(e.target.value as "fisica" | "juridica")}
          >
            <option value="fisica">Pessoa física (CPF)</option>
            <option value="juridica">Pessoa jurídica (CNPJ)</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Seu nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cpf">Seu CPF</Label>
            <Input id="cpf" name="cpf" required inputMode="numeric" placeholder="000.000.000-00" />
            <p className="text-xs text-[var(--text-muted)]">
              Sempre obrigatório: é o CPF do responsável legal pela conta.
            </p>
          </div>
        </div>

        {tipoPessoa === "juridica" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="razao_social">{tipoPessoa === "juridica" ? "Razão social" : "Nome completo (produtor)"}</Label>
          <Input id="razao_social" name="razao_social" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome_fantasia">Nome de exibição / marca</Label>
          <Input id="nome_fantasia" name="nome_fantasia" placeholder="Ex: V8 Produções" />
          <p className="text-xs text-[var(--text-muted)]">Vira a URL da sua página: ingressou.com/seu-nome</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" inputMode="tel" placeholder="(00) 00000-0000" />
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
          {pending ? "Enviando..." : "Enviar cadastro"}
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
