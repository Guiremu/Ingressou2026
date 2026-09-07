import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Formata progressivamente enquanto o usuário digita: 01479887235 -> 014.798.872-35. */
export function formatCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Formata progressivamente: 12345678000199 -> 12.345.678/0001-99. */
export function formatCnpj(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Formata progressivamente: (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo). */
export function formatTelefone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  const comDDD = digits.replace(/(\d{2})(\d)/, "($1) $2");
  return digits.length > 10 ? comDDD.replace(/(\d{5})(\d{1,4})$/, "$1-$2") : comDDD.replace(/(\d{4})(\d{1,4})$/, "$1-$2");
}

/** Validação de dígitos verificadores de CPF (não só o tamanho — rejeita CPFs "de mentira"). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const checkDigit = (base: string) => {
    let total = 0;
    let factor = base.length + 1;
    for (const digit of base) total += Number(digit) * factor--;
    const resto = (total * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = checkDigit(cpf.slice(0, 9));
  const d2 = checkDigit(cpf.slice(0, 9) + d1);
  return cpf === cpf.slice(0, 9) + d1 + d2;
}

/** Validação de dígitos verificadores de CNPJ. */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const checkDigit = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let total = 0;
    for (let i = 0; i < base.length; i++) total += Number(base[i]) * pesos[i];
    const resto = total % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = checkDigit(cnpj.slice(0, 12));
  const d2 = checkDigit(cnpj.slice(0, 12) + d1);
  return cnpj === cnpj.slice(0, 12) + d1 + d2;
}

export function diasAtrasISO(dias: number) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
}

export function anoAtual() {
  return new Date().getFullYear();
}
