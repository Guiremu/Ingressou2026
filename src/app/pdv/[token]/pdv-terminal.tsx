"use client";

import { useActionState, useState, useTransition } from "react";
import { criarVendaPdv, listarLotesDoEvento, type PdvSaleState } from "./actions";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
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

const FORMAS_PAGAMENTO: { value: "dinheiro" | "debito" | "credito" | "pix"; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "pix", label: "PIX (maquininha da loja)" },
];

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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [carregandoLotes, setCarregandoLotes] = useState(false);
  const [erroLotes, setErroLotes] = useState<string | null>(null);
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorCpf, setCompradorCpf] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "debito" | "credito" | "pix">("dinheiro");
  const [, startTransition] = useTransition();

  const [state, formAction, pending] = useActionState(criarVendaPdv, initialState);

  const subtotal = lotes.reduce((acc, l) => acc + (qtds[l.id] ?? 0) * Number(l.preco), 0);
  const qtdTotal = Object.values(qtds).reduce((a, b) => a + b, 0);

  function escolherEvento(evento: Evento) {
    setEventId(evento.id);
    setEventoTitulo(evento.titulo);
    setLotes([]);
    setQtds({});
    setErroLotes(null);
    setCarregandoLotes(true);
    startTransition(async () => {
      const res = await listarLotesDoEvento(token, evento.id);
      setCarregandoLotes(false);
      if ("error" in res && res.error) {
        setErroLotes(res.error);
        return;
      }
      if ("ticketTypes" in res) setLotes(res.ticketTypes as Lote[]);
      setStep(2);
    });
  }

  function novaVenda() {
    setStep(1);
    setEventId(null);
    setEventoTitulo("");
    setLotes([]);
    setQtds({});
    setCompradorNome("");
    setCompradorCpf("");
    setFormaPagamento("dinheiro");
  }

  if (state.tickets) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 py-8">
        <div className="rounded-[24px] border border-[var(--success)]/30 bg-[var(--success)]/10 p-6 text-center">
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 py-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">PDV · {nomeTerminal}</p>
        <h1 className="font-[var(--font-sora)] text-lg font-extrabold text-white">{produtorNome}</h1>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-white">1. Escolha o evento</h2>
          {eventos.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">Nenhum evento publicado no momento.</p>
          )}
          {eventos.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => escolherEvento(e)}
              disabled={carregandoLotes}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left"
            >
              <p className="font-semibold text-white">{e.titulo}</p>
              <p className="text-xs text-[var(--text-muted)]">{formatDate(e.data_inicio)}</p>
            </button>
          ))}
          {erroLotes && <p className="text-sm text-[var(--error)]">{erroLotes}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setStep(1)} className="self-start text-xs text-[var(--text-dim)]">
            ← Trocar evento
          </button>
          <h2 className="text-sm font-bold text-white">2. Ingressos</h2>
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            {lotes.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nenhum lote disponível.</p>}
            {lotes.map((l, i) => {
              const restantes = l.quantidade_total - l.quantidade_vendida;
              return (
                <div key={l.id}>
                  {i > 0 && <div className="mb-3 h-px bg-[var(--border)]" />}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{l.nome}</p>
                      <p className="text-xs text-[var(--text-dim)]">{formatCurrency(Number(l.preco))} cada</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQtds((q) => ({ ...q, [l.id]: Math.max(0, (q[l.id] ?? 0) - 1) }))}
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-2)] text-lg text-white"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center font-bold text-white">{qtds[l.id] ?? 0}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQtds((q) => ({
                            ...q,
                            [l.id]: Math.min(l.max_por_pedido, restantes, (q[l.id] ?? 0) + 1),
                          }))
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--accent)] text-lg font-bold text-[var(--accent-foreground)]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Button type="button" disabled={qtdTotal === 0} onClick={() => setStep(3)}>
            Continuar ({formatCurrency(subtotal)})
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setStep(2)} className="self-start text-xs text-[var(--text-dim)]">
            ← Voltar
          </button>
          <h2 className="text-sm font-bold text-white">3. Dados do comprador (opcional)</h2>
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pdv_comprador_nome">Nome</Label>
              <input
                id="pdv_comprador_nome"
                value={compradorNome}
                onChange={(e) => setCompradorNome(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-4)] px-3 text-sm text-white placeholder:text-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pdv_comprador_cpf">CPF</Label>
              <MaskedInput
                mask="cpf"
                id="pdv_comprador_cpf"
                value={compradorCpf}
                onChange={(e) => setCompradorCpf(e.target.value)}
              />
              <p className="text-xs text-[var(--text-dim)]">
                Se informado e já tiver conta na Ingressou, o ingresso já cai em &quot;Meus
                ingressos&quot; dessa pessoa.
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setStep(4)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setStep(3)} className="self-start text-xs text-[var(--text-dim)]">
            ← Voltar
          </button>
          <h2 className="text-sm font-bold text-white">4. Forma de pagamento</h2>
          <div className="flex flex-col gap-2">
            {FORMAS_PAGAMENTO.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormaPagamento(f.value)}
                className={`rounded-2xl border-[1.5px] bg-[var(--surface)] p-3.5 text-left text-sm font-semibold text-white ${
                  formaPagamento === f.value ? "border-[var(--accent)]" : "border-[var(--border-2)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => setStep(5)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 5 && eventId && (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="event_id" value={eventId} />
          <input
            type="hidden"
            name="itens"
            value={JSON.stringify(lotes.map((l) => ({ ticketTypeId: l.id, quantidade: qtds[l.id] ?? 0 })))}
          />
          <input type="hidden" name="forma_pagamento" value={formaPagamento} />
          <input type="hidden" name="comprador_nome" value={compradorNome} />
          <input type="hidden" name="comprador_cpf" value={compradorCpf} />

          <button type="button" onClick={() => setStep(4)} className="self-start text-xs text-[var(--text-dim)]">
            ← Voltar
          </button>
          <h2 className="text-sm font-bold text-white">5. Confirmar venda</h2>
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
            <p className="text-white">{eventoTitulo}</p>
            {lotes
              .filter((l) => (qtds[l.id] ?? 0) > 0)
              .map((l) => (
                <div key={l.id} className="flex justify-between text-[var(--text-muted-2)]">
                  <span>
                    {l.nome} × {qtds[l.id]}
                  </span>
                  <span>{formatCurrency(Number(l.preco) * (qtds[l.id] ?? 0))}</span>
                </div>
              ))}
            <div className="mt-1 flex justify-between border-t border-[var(--border)] pt-2 font-bold text-white">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-[var(--text-muted-2)]">
              {FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label}
            </p>
            {compradorNome && <p className="text-[var(--text-muted-2)]">Comprador: {compradorNome}</p>}
          </div>
          {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Registrando..." : "Confirmar venda"}
          </Button>
        </form>
      )}
    </main>
  );
}
