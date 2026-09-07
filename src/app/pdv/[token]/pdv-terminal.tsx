"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  Banknote,
  ChevronLeft,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import { criarVendaPdv, listarLotesDoEvento, type PdvSaleState } from "./actions";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Evento {
  id: string;
  titulo: string;
  data_inicio: string;
}

interface Lote {
  id: string;
  nome: string;
  preco: number;
  max_por_pedido: number;
  quantidade_total: number;
  quantidade_vendida: number;
}

type Forma = "dinheiro" | "debito" | "credito" | "pix";

interface Pagamento {
  forma: Forma;
  valor: number;
}

const FORMAS_PAGAMENTO: { value: Forma; label: string; icon: typeof Banknote }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: QrCode },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

const initialState: PdvSaleState = {};

export function PdvTerminal({
  token,
  produtorNome,
  nomeTerminal,
  eventos,
}: {
  token: string;
  produtorNome: string;
  nomeTerminal: string;
  eventos: Evento[];
}) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregandoLotes, setCarregandoLotes] = useState(false);
  const [erroLotes, setErroLotes] = useState<string | null>(null);
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorCpf, setCompradorCpf] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [state, formAction, pending] = useActionState(criarVendaPdv, initialState);

  const subtotal = useMemo(
    () => round2(lotes.reduce((acc, l) => acc + (qtds[l.id] ?? 0) * Number(l.preco), 0)),
    [lotes, qtds],
  );
  const qtdTotal = Object.values(qtds).reduce((a, b) => a + b, 0);
  const totalPago = useMemo(() => round2(pagamentos.reduce((acc, p) => acc + p.valor, 0)), [pagamentos]);
  const restante = round2(subtotal - totalPago);

  function escolherEvento(evento: Evento) {
    setEventId(evento.id);
    setEventoTitulo(evento.titulo);
    setLotes([]);
    setQtds({});
    setPagamentos([]);
    setErroLotes(null);
    setCarregandoLotes(true);
    startTransition(async () => {
      const res = await listarLotesDoEvento(token, evento.id);
      setCarregandoLotes(false);
      if ("error" in res && res.error) {
        setErroLotes(res.error);
        setEventId(null);
        return;
      }
      if ("ticketTypes" in res) setLotes(res.ticketTypes as Lote[]);
    });
  }

  function adicionar(lote: Lote) {
    const restantesEstoque = lote.quantidade_total - lote.quantidade_vendida;
    setQtds((q) => ({ ...q, [lote.id]: Math.min(lote.max_por_pedido, restantesEstoque, (q[lote.id] ?? 0) + 1) }));
  }

  function remover(loteId: string) {
    setQtds((q) => ({ ...q, [loteId]: Math.max(0, (q[loteId] ?? 0) - 1) }));
  }

  function adicionarPagamento(forma: Forma) {
    setErroPagamento(null);
    const valorSugerido = round2(subtotal - totalPago);
    if (valorSugerido <= 0) return;
    setPagamentos((p) => [...p, { forma, valor: valorSugerido }]);
  }

  function atualizarValorPagamento(index: number, valor: number) {
    setPagamentos((p) => p.map((item, i) => (i === index ? { ...item, valor: Math.max(0, valor) } : item)));
  }

  function removerPagamento(index: number) {
    setPagamentos((p) => p.filter((_, i) => i !== index));
  }

  function novaVenda() {
    setEventId(null);
    setEventoTitulo("");
    setLotes([]);
    setQtds({});
    setCompradorNome("");
    setCompradorCpf("");
    setPagamentos([]);
    setErroPagamento(null);
  }

  function handleSubmit(formData: FormData) {
    if (qtdTotal === 0) {
      setErroPagamento("Adicione ao menos um ingresso ao carrinho.");
      return;
    }
    if (pagamentos.length === 0) {
      setErroPagamento("Selecione ao menos uma forma de pagamento.");
      return;
    }
    if (restante !== 0) {
      setErroPagamento(
        restante > 0
          ? `Falta registrar ${formatCurrency(restante)} em alguma forma de pagamento.`
          : `O valor pago excede o total em ${formatCurrency(Math.abs(restante))}.`,
      );
      return;
    }
    setErroPagamento(null);
    formAction(formData);
  }

  if (state.tickets) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
        <div className="rounded-[24px] border border-[var(--success)]/30 bg-[var(--success)]/10 p-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)] text-2xl font-extrabold text-[#07070b]">
            ✓
          </div>
          <p className="font-[var(--font-sora)] text-xl font-extrabold text-[var(--success)]">Venda registrada!</p>
          <p className="mt-1.5 text-sm text-[var(--text-muted-2)]">{eventoTitulo}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {state.tickets.map((t, i) => (
            <a
              key={t.codigoQr}
              href={t.printUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-bold text-[var(--accent-foreground)]"
            >
              Imprimir ingresso {state.tickets!.length > 1 ? `#${i + 1}` : ""}
            </a>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={novaVenda}>
          Nova venda
        </Button>
      </main>
    );
  }

  if (!eventId) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--purple)]">
            PDV · {nomeTerminal}
          </p>
          <h1 className="font-[var(--font-sora)] text-xl font-extrabold text-white">{produtorNome}</h1>
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-[#93a0b8]">Escolha o evento</h2>
          {eventos.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento publicado no momento.</p>
          )}
          {eventos.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => escolherEvento(e)}
              disabled={carregandoLotes}
              className="rounded-2xl border border-[#263041] bg-[#121722] p-4 text-left disabled:opacity-60"
            >
              <p className="font-semibold text-white">{e.titulo}</p>
              <p className="text-xs text-[#93a0b8]">{formatDate(e.data_inicio)}</p>
            </button>
          ))}
          {erroLotes && <p className="text-sm text-[var(--error)]">{erroLotes}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-4 px-4 py-4 lg:py-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#263041] bg-[#0f141d] px-4 py-3">
        <button
          type="button"
          onClick={novaVenda}
          className="flex items-center gap-1 text-xs font-semibold text-[#93a0b8]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Trocar evento
        </button>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--purple)]">
            PDV · {nomeTerminal}
          </p>
          <p className="text-sm font-bold text-white">{eventoTitulo}</p>
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#93a0b8]">Ingressos</h2>
          {carregandoLotes && <p className="text-sm text-[var(--text-muted)]">Carregando lotes...</p>}
          {!carregandoLotes && lotes.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Nenhum lote disponível para este evento.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lotes.map((l) => {
              const restantesEstoque = l.quantidade_total - l.quantidade_vendida;
              const qtd = qtds[l.id] ?? 0;
              const esgotado = restantesEstoque <= 0;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => adicionar(l)}
                  disabled={esgotado || qtd >= l.max_por_pedido || qtd >= restantesEstoque}
                  className={`relative flex flex-col gap-2 rounded-2xl border-[1.5px] p-4 text-left transition disabled:opacity-40 ${
                    qtd > 0
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[#263041] bg-[#121722]"
                  }`}
                >
                  {qtd > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-extrabold text-[var(--accent-foreground)]">
                      {qtd}
                    </span>
                  )}
                  <p className="text-sm font-bold leading-tight text-white">{l.nome}</p>
                  <p className="font-[var(--font-sora)] text-lg font-extrabold text-[var(--accent)]">
                    {formatCurrency(Number(l.preco))}
                  </p>
                  <p className="text-[11px] text-[#5d6b84]">
                    {esgotado ? "Esgotado" : `${restantesEstoque} disponíveis`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-3 rounded-2xl border border-[#263041] bg-[#0b0e14] p-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#93a0b8]" />
            <h2 className="text-sm font-bold text-white">Carrinho</h2>
          </div>

          <div className="flex flex-col gap-2">
            {qtdTotal === 0 && <p className="text-sm text-[#5d6b84]">Toque em um ingresso para adicionar.</p>}
            {lotes
              .filter((l) => (qtds[l.id] ?? 0) > 0)
              .map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#263041] bg-[#121722] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{l.nome}</p>
                    <p className="text-xs text-[#93a0b8]">{formatCurrency(Number(l.preco))} cada</p>
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remover(l.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#263041] text-white"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-4 text-center text-sm font-bold text-white">{qtds[l.id]}</span>
                    <button
                      type="button"
                      onClick={() => adicionar(l)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="h-px bg-[#263041]" />

          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-[#93a0b8]">
              Dados do comprador (opcional)
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <input
                value={compradorNome}
                onChange={(e) => setCompradorNome(e.target.value)}
                placeholder="Nome"
                className="flex h-9 w-full rounded-lg border border-[#263041] bg-[#121722] px-2.5 text-sm text-white placeholder:text-[#5d6b84] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
              <MaskedInput
                mask="cpf"
                value={compradorCpf}
                onChange={(e) => setCompradorCpf(e.target.value)}
                placeholder="CPF"
                className="h-9 border-[#263041] bg-[#121722] text-sm"
              />
            </div>
          </details>

          <div className="h-px bg-[#263041]" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="font-[var(--font-sora)] text-xl font-extrabold text-white">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => adicionarPagamento(f.value)}
                  disabled={restante <= 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#263041] bg-[#121722] py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          {pagamentos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {pagamentos.map((p, i) => {
                const label = FORMAS_PAGAMENTO.find((f) => f.value === p.forma)?.label;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-[#263041] bg-[#121722] px-2.5 py-2"
                  >
                    <Wallet className="h-3.5 w-3.5 flex-none text-[#93a0b8]" />
                    <span className="flex-none text-xs font-semibold text-white">{label}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={p.valor}
                      onChange={(e) => atualizarValorPagamento(i, Number(e.target.value))}
                      className="h-8 w-full min-w-0 rounded-lg border border-[#263041] bg-[#18202e] px-2 text-right text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => removerPagamento(i)}
                      className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[#93a0b8]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
              restante === 0
                ? "bg-[var(--success)]/12 text-[var(--success)]"
                : "bg-[var(--warning)]/12 text-[var(--warning)]"
            }`}
          >
            <span>{restante === 0 ? "Pagamento completo" : "Restante"}</span>
            <span>{formatCurrency(Math.max(0, restante))}</span>
          </div>

          {(erroPagamento || state.error) && (
            <p className="text-xs text-[var(--error)]">{erroPagamento ?? state.error}</p>
          )}

          <form action={handleSubmit}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="event_id" value={eventId} />
            <input
              type="hidden"
              name="itens"
              value={JSON.stringify(lotes.map((l) => ({ ticketTypeId: l.id, quantidade: qtds[l.id] ?? 0 })))}
            />
            <input
              type="hidden"
              name="pagamentos"
              value={JSON.stringify(pagamentos.map((p) => ({ forma_pagamento: p.forma, valor: p.valor })))}
            />
            <input type="hidden" name="comprador_nome" value={compradorNome} />
            <input type="hidden" name="comprador_cpf" value={compradorCpf} />
            <Button type="submit" disabled={pending} className="mt-1 w-full">
              {pending ? "Registrando..." : "Finalizar venda"}
            </Button>
          </form>
        </aside>
      </div>
    </main>
  );
}
