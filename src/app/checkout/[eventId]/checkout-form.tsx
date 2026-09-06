"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { criarPedido, buscarDestinatarioPorCpf, type CheckoutState } from "./actions";
import { calculateSplit } from "@/lib/split-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, onlyDigits } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";

export interface CompradorLogado {
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
}

export interface LoteCarrinho {
  id: string;
  nome: string;
  preco: number;
  quantidadeInicial: number;
  restantes: number;
  maxPorPedido: number;
}

export interface FeeTable {
  pix: Record<number, number>;
  credito: Record<number, number>;
}

declare global {
  interface Window {
    MercadoPago: new (publicKey: string) => {
      cardForm: (config: Record<string, unknown>) => { getCardFormData: () => CardFormData };
    };
  }
}

interface CardFormData {
  token: string;
  paymentMethodId: string;
  installments: string;
}

const PARCELAS_OPCOES = [1, 3, 6, 12];
const initialState: CheckoutState = {};

export function CheckoutForm({
  eventId,
  eventTitulo,
  lotes,
  mpPublicKey,
  feeTable,
  taxaPlataformaPercentual,
  comprador,
}: {
  eventId: string;
  eventTitulo: string;
  lotes: LoteCarrinho[];
  mpPublicKey: string | null;
  feeTable: FeeTable;
  taxaPlataformaPercentual: number;
  comprador: CompradorLogado;
}) {
  const [state, formAction, pending] = useActionState(criarPedido, initialState);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qtds, setQtds] = useState<Record<string, number>>(
    Object.fromEntries(lotes.map((l) => [l.id, l.quantidadeInicial])),
  );
  const [metodo, setMetodo] = useState<PaymentMethod>("pix");
  const [parcelas, setParcelas] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenizedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);

  const [presenteando, setPresenteando] = useState(false);
  const [destinatarioCpf, setDestinatarioCpf] = useState("");
  const [destinatario, setDestinatario] = useState<{ nome: string } | null>(null);
  const [buscandoDestinatario, setBuscandoDestinatario] = useState(false);
  const [erroDestinatario, setErroDestinatario] = useState("");

  async function verificarDestinatario(cpf: string) {
    const cpfLimpo = onlyDigits(cpf);
    setDestinatario(null);
    setErroDestinatario("");
    if (cpfLimpo.length !== 11) return;
    setBuscandoDestinatario(true);
    const resultado = await buscarDestinatarioPorCpf(cpfLimpo);
    setBuscandoDestinatario(false);
    if (resultado.nome) setDestinatario({ nome: resultado.nome });
    else setErroDestinatario("Não encontramos uma conta com esse CPF. A pessoa precisa ter um cadastro na ingressou.");
  }

  const subtotal = lotes.reduce((acc, l) => acc + (qtds[l.id] ?? 0) * l.preco, 0);
  const qtdTotal = Object.values(qtds).reduce((a, b) => a + b, 0);

  const feePercentual =
    metodo === "pix" ? (feeTable.pix[1] ?? 0) : (feeTable.credito[parcelas] ?? feeTable.credito[1] ?? 0);

  const split = useMemo(
    () =>
      calculateSplit({
        valorIngressos: subtotal,
        metodoPagamento: metodo,
        parcelas: metodo === "pix" ? 1 : parcelas,
        taxaMpPercentual: feePercentual,
        taxaPlataformaPercentual,
      }),
    [subtotal, metodo, parcelas, feePercentual, taxaPlataformaPercentual],
  );

  useEffect(() => {
    if (metodo !== "credito" || !sdkReady || !mpPublicKey || !formRef.current || step !== 3) return;

    const mp = new window.MercadoPago(mpPublicKey);
    const cardForm = mp.cardForm({
      amount: String(split.valorTotalCobrado.toFixed(2)),
      iframe: true,
      form: {
        id: "form-checkout",
        cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número do cartão" },
        expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/AA" },
        securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
        cardholderName: { id: "form-checkout__cardholderName", placeholder: "Titular do cartão" },
        issuer: { id: "form-checkout__issuer", placeholder: "Banco emissor" },
        installments: { id: "form-checkout__installments", placeholder: "Parcelas" },
        identificationType: { id: "form-checkout__identificationType" },
        identificationNumber: { id: "form-checkout__identificationNumber", placeholder: "CPF do titular" },
        cardholderEmail: { id: "form-checkout__cardholderEmail", placeholder: "E-mail do titular" },
      },
      callbacks: {
        onSubmit: (event: Event) => {
          if (tokenizedRef.current) return;
          event.preventDefault();
          const data = cardForm.getCardFormData();
          const form = formRef.current!;
          (form.elements.namedItem("card_token") as HTMLInputElement).value = data.token;
          (form.elements.namedItem("payment_method_id") as HTMLInputElement).value = data.paymentMethodId;
          tokenizedRef.current = true;
          form.requestSubmit();
        },
      },
    });
  }, [metodo, sdkReady, mpPublicKey, step, split.valorTotalCobrado]);

  if (state.status === "aprovado" && state.orderId) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-6 text-center">
          <p className="font-[var(--font-sora)] font-bold text-[var(--success)]">Pagamento aprovado!</p>
          <p className="mt-2 text-sm text-[var(--text-muted-2)]">Seus ingressos já foram gerados.</p>
          <a href={`/pedido/${state.orderId}`} className="mt-4 inline-block font-medium text-[var(--accent)] underline">
            Ver meus ingressos
          </a>
        </div>
      </main>
    );
  }

  if (state.status === "pendente" && state.pixQrCodeBase64) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <p className="font-[var(--font-sora)] font-bold text-white">Escaneie o QR Code para pagar com PIX</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${state.pixQrCodeBase64}`}
            alt="QR Code PIX"
            className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-2"
          />
          <p className="mt-4 text-xs text-[var(--text-dim)]">Ou copie o código:</p>
          <textarea
            readOnly
            value={state.pixQrCode}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-4)] p-2 text-xs text-white"
            rows={3}
          />
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Assim que o pagamento for confirmado, seus ingressos aparecerão em{" "}
            <a href={`/pedido/${state.orderId}`} className="text-[var(--accent)] underline">
              meus ingressos
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Ingressos" },
    { n: 2, label: "Dados" },
    { n: 3, label: "Pagamento" },
  ];

  const ctaLabel =
    step < 3
      ? "Continuar"
      : metodo === "pix"
        ? `Gerar PIX de ${formatCurrency(split.valorTotalCobrado)}`
        : `Pagar ${formatCurrency(split.valorTotalCobrado)}`;

  const dadosIncompletos = step === 2 && presenteando && !destinatario;

  function avancar(e: React.MouseEvent) {
    e.preventDefault();
    if (dadosIncompletos) return;
    if (step < 3) setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="rounded-[24px] border border-[var(--border)] bg-[#0e0e16] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <p className="text-[13px] text-[var(--text-muted)]">← {eventTitulo}</p>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            <p className="text-xs text-[var(--text-muted)]">Reserva ativa</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4.5">
          {steps.map((s) => (
            <div key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => s.n < step && setStep(s.n)}
                className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                  step >= s.n ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "border border-[var(--border-2)] text-[var(--text-dim)]"
                }`}
              >
                {s.n}
              </button>
              <span className={`whitespace-nowrap text-[13px] font-semibold ${step >= s.n ? "text-white" : "text-[var(--text-dim)]"}`}>
                {s.label}
              </span>
              <div className={`h-px min-w-2 flex-1 ${step > s.n ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
            </div>
          ))}
        </div>

        <form ref={formRef} id="form-checkout" action={formAction} className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1.3fr_0.85fr] lg:items-start">
          <input type="hidden" name="event_id" value={eventId} />
          <input
            type="hidden"
            name="itens"
            value={JSON.stringify(lotes.map((l) => ({ ticketTypeId: l.id, quantidade: qtds[l.id] ?? 0 })))}
          />
          <input type="hidden" name="card_token" />
          <input type="hidden" name="payment_method_id" />
          <input type="hidden" name="parcelas" value={metodo === "pix" ? 1 : parcelas} />
          <input type="hidden" name="metodo_pagamento" value={metodo} />
          <input type="hidden" name="presenteando" value={presenteando ? "1" : ""} />
          {presenteando && <input type="hidden" name="destinatario_cpf" value={destinatarioCpf} />}

          <div className="flex min-w-0 flex-col gap-[22px]">
            {step === 1 && (
              <div className="flex flex-col gap-3">
                <h2 className="font-[var(--font-sora)] text-[17px] font-bold text-white">1. Seus ingressos</h2>
                <div className="flex flex-col gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  {lotes.map((lote, i) => (
                    <div key={lote.id}>
                      {i > 0 && <div className="mb-3.5 h-px bg-[#262633]" />}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[15px] font-semibold text-white">{lote.nome}</p>
                          <p className="text-xs text-[var(--text-dim)]">{formatCurrency(lote.preco)} cada</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQtds((q) => ({ ...q, [lote.id]: Math.max(0, (q[lote.id] ?? 0) - 1) }))}
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[var(--border-2)] text-lg text-[#e6e6f0]"
                          >
                            −
                          </button>
                          <span className="min-w-4 text-center font-[var(--font-sora)] text-base font-bold text-white">
                            {qtds[lote.id] ?? 0}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQtds((q) => ({
                                ...q,
                                [lote.id]: Math.min(lote.maxPorPedido, lote.restantes, (q[lote.id] ?? 0) + 1),
                              }))
                            }
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[var(--accent)] text-lg font-bold text-[var(--accent-foreground)]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                <h2 className="font-[var(--font-sora)] text-[17px] font-bold text-white">2. Para quem é esse ingresso?</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPresenteando(false)}
                    className={`flex flex-col gap-1 rounded-2xl border-[1.5px] bg-[var(--surface)] p-3.5 text-left ${
                      !presenteando ? "border-[var(--accent)]" : "border-[var(--border-2)]"
                    }`}
                  >
                    <span className="text-[15px] font-bold text-white">Para mim</span>
                    <span className="text-xs text-[var(--text-muted-2)]">O ingresso fica na sua conta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresenteando(true)}
                    className={`flex flex-col gap-1 rounded-2xl border-[1.5px] bg-[var(--surface)] p-3.5 text-left ${
                      presenteando ? "border-[var(--accent)]" : "border-[var(--border-2)]"
                    }`}
                  >
                    <span className="text-[15px] font-bold text-white">Comprar para outra pessoa</span>
                    <span className="text-xs text-[var(--text-muted-2)]">Vai direto pra conta dela</span>
                  </button>
                </div>

                {!presenteando && (
                  <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
                    <p className="text-white">{comprador.nome}</p>
                    <p className="text-[var(--text-muted-2)]">{comprador.email}</p>
                    <p className="text-[var(--text-muted-2)]">CPF {comprador.cpf}</p>
                  </div>
                )}

                {presenteando && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="destinatario_cpf_input">CPF de quem vai receber o ingresso</Label>
                    <Input
                      id="destinatario_cpf_input"
                      inputMode="numeric"
                      value={destinatarioCpf}
                      onChange={(e) => setDestinatarioCpf(e.target.value)}
                      onBlur={(e) => verificarDestinatario(e.target.value)}
                      placeholder="Só números"
                    />
                    {buscandoDestinatario && <p className="text-xs text-[var(--text-dim)]">Verificando...</p>}
                    {destinatario && (
                      <p className="text-xs text-[var(--success)]">Ingresso vai para: {destinatario.nome}</p>
                    )}
                    {erroDestinatario && <p className="text-xs text-[var(--error)]">{erroDestinatario}</p>}
                  </div>
                )}

                <p className="text-xs text-[var(--text-dim)]">O ingresso aparece em &quot;Meus ingressos&quot; de quem vai usá-lo.</p>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-3">
                <h2 className="font-[var(--font-sora)] text-[17px] font-bold text-white">3. Pagamento</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMetodo("pix")}
                    className={`flex flex-col gap-1.5 rounded-2xl border-[1.5px] bg-[var(--surface)] p-3.5 text-left ${
                      metodo === "pix" ? "border-[var(--accent)]" : "border-[var(--border-2)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-white">PIX</span>
                      <span
                        className={`h-[18px] w-[18px] rounded-full ${metodo === "pix" ? "bg-[var(--accent)] ring-4 ring-[var(--surface)] ring-offset-1 ring-offset-[var(--accent)]" : "shadow-[inset_0_0_0_1.5px_#4a4a60]"}`}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted-2)]">Aprovação na hora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodo("credito")}
                    className={`flex flex-col gap-1.5 rounded-2xl border-[1.5px] bg-[var(--surface)] p-3.5 text-left ${
                      metodo === "credito" ? "border-[var(--accent)]" : "border-[var(--border-2)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-white">Cartão de crédito</span>
                      <span
                        className={`h-[18px] w-[18px] rounded-full ${metodo === "credito" ? "bg-[var(--accent)] ring-4 ring-[var(--surface)] ring-offset-1 ring-offset-[var(--accent)]" : "shadow-[inset_0_0_0_1.5px_#4a4a60]"}`}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted-2)]">Em até 12x</span>
                  </button>
                </div>

                {metodo === "credito" && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    {mpPublicKey && <Script src="https://sdk.mercadopago.com/js/v2" onLoad={() => setSdkReady(true)} />}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input id="form-checkout__cardNumber" className="h-10 rounded-xl border border-[var(--border-2)] bg-[#1b1b26] px-3 text-sm text-white" />
                      <div className="flex gap-3">
                        <input id="form-checkout__expirationDate" className="h-10 flex-1 rounded-xl border border-[var(--border-2)] bg-[#1b1b26] px-3 text-sm text-white" />
                        <input id="form-checkout__securityCode" className="h-10 flex-1 rounded-xl border border-[var(--border-2)] bg-[#1b1b26] px-3 text-sm text-white" />
                      </div>
                    </div>
                    <Input id="form-checkout__cardholderName" placeholder="Titular do cartão" />
                    <select id="form-checkout__issuer" className="h-10 rounded-xl border border-[var(--border-2)] bg-[#1b1b26] px-3 text-sm text-white" />
                    <select id="form-checkout__identificationType" className="h-10 rounded-xl border border-[var(--border-2)] bg-[#1b1b26] px-3 text-sm text-white" />
                    <Input id="form-checkout__identificationNumber" placeholder="CPF do titular" />
                    <Input id="form-checkout__cardholderEmail" placeholder="E-mail do titular" />

                    <p className="mt-1 text-xs text-[var(--text-muted-2)]">Parcelas</p>
                    <div className="flex flex-wrap gap-2">
                      {PARCELAS_OPCOES.map((p) => {
                        const pct = feeTable.credito[p] ?? feeTable.credito[1] ?? 0;
                        const s = calculateSplit({
                          valorIngressos: subtotal,
                          metodoPagamento: "credito",
                          parcelas: p,
                          taxaMpPercentual: pct,
                          taxaPlataformaPercentual,
                        });
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setParcelas(p)}
                            className={`min-w-[96px] rounded-xl px-3 py-2.5 text-left ${
                              parcelas === p ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "border border-[var(--border-2)] bg-[#1b1b26] text-[#e6e6f0]"
                            }`}
                          >
                            <div className="text-sm font-bold">{p === 1 ? "1x" : `${p}x`}</div>
                            <div className="text-[11px] opacity-75">{formatCurrency(s.valorTotalCobrado / p)}</div>
                          </button>
                        );
                      })}
                    </div>

                    {parcelas > 1 && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3">
                        <div className="mt-0.5 h-4 w-4 flex-none rounded-full bg-[var(--warning)]" />
                        <p className="text-xs leading-relaxed text-[#fde68a]">
                          Em {parcelas}x o acréscimo de parcelamento é repassado a você. Total {formatCurrency(split.valorTotalCobrado)} — {parcelas} parcelas de{" "}
                          {formatCurrency(split.valorTotalCobrado / parcelas)}.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {metodo === "pix" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[var(--success)]/28 bg-[var(--success)]/10 p-3">
                    <div className="mt-0.5 h-4 w-4 flex-none rounded-full bg-[var(--success)]" />
                    <p className="text-xs leading-relaxed text-[#a7f3d0]">
                      No PIX não há acréscimo de parcelamento. O QR de pagamento aparece na próxima tela.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4.5 lg:sticky lg:top-24">
            <h2 className="font-[var(--font-sora)] text-base font-bold text-white">Resumo</h2>
            <div className="flex flex-col gap-2.5">
              {lotes
                .filter((l) => (qtds[l.id] ?? 0) > 0)
                .map((l) => (
                  <div key={l.id} className="flex justify-between gap-3 text-[13px]">
                    <span className="text-[var(--text-muted-2)]">
                      {l.nome} × {qtds[l.id]}
                    </span>
                    <span className="text-white">{formatCurrency(l.preco * (qtds[l.id] ?? 0))}</span>
                  </div>
                ))}
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="text-[var(--text-muted-2)]">Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              {split.valorTaxaParcelamento > 0 && (
                <div className="flex justify-between gap-3 text-[13px]">
                  <span className="text-[var(--text-muted-2)]">Acréscimo de parcelamento</span>
                  <span className="text-white">{formatCurrency(split.valorTaxaParcelamento)}</span>
                </div>
              )}
            </div>
            <div className="h-px bg-[#262633]" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-[#e6e6f0]">Total</span>
              <span className="font-[var(--font-sora)] text-[26px] font-bold text-[var(--accent)]">
                {formatCurrency(split.valorTotalCobrado)}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted-2)]">
              {metodo === "pix" ? "PIX à vista · aprovação imediata" : `${parcelas}x de ${formatCurrency(split.valorTotalCobrado / parcelas)} no cartão`}
            </p>

            {state.error && <p className="text-sm text-[var(--error)]">{state.error}</p>}

            <Button
              type={step < 3 ? "button" : "submit"}
              onClick={step < 3 ? avancar : undefined}
              disabled={pending || qtdTotal === 0 || dadosIncompletos}
              className="rounded-[14px]"
            >
              {pending ? "Processando..." : ctaLabel}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-[var(--text-dim)]">
              Ao concluir você concorda com os termos de uso e a política de reembolso do produtor.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
