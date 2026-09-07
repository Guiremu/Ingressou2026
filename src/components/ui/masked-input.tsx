"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCpf, formatCnpj, formatTelefone } from "@/lib/utils";

const maskers = { cpf: formatCpf, cnpj: formatCnpj, telefone: formatTelefone };

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  mask: keyof typeof maskers;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Input que formata progressivamente enquanto o usuário digita (CPF/CNPJ/telefone). */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, defaultValue, ...props }, ref) => {
    const [value, setValue] = React.useState(() => maskers[mask](String(defaultValue ?? "")));

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        {...props}
        value={value}
        onChange={(e) => {
          setValue(maskers[mask](e.target.value));
          onChange?.(e);
        }}
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";
