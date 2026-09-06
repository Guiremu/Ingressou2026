"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { criarPedido, type CheckoutState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

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

const initialState: CheckoutState = {};

export function CheckoutForm({
  eventId,
  ticketTypeId,
  maxPorPedido,
  precoUnitario,
  mpPublicKey,
}: {
  eventId: string;
  ticketTypeId: string;
  maxPorPedido: number;
  precoUnitario: number;
  mpPublicKey: string | null;
}) {
  const [state, formAction, pending] = useActionState(criarPedido, initialState);
  const [metodo, setMetodo] = useState<"pix" | "credito">("pix");
  const [quantidade, setQuantidade] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenizedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (metodo !== "credito" || !sdkReady || !mpPublicKey || !formRef.current) return;

    const mp = new window.MercadoPago(mpPublicKey);
    const cardForm = mp.cardForm({
      amount: String((precoUnitario * quantidade).toFixed(2)),
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
          if (tokenizedRef.current) return; // segunda submissão: envia de fato para a server action
          event.preventDefault();
          const data = cardForm.getCardFormData();
          const form = formRef.current!;
          (form.elements.namedItem("card_token") as HTMLInputElement).value = data.token;
          (form.elements.namedItem("payment_method_id") as HTMLInputElement).value = data.paymentMethodId;
          (form.elements.namedItem("parcelas") as HTMLInputElement).value = data.installments;
          tokenizedRef.current = true;
          form.requestSubmit();
        },
      },
    });
  }, [metodo, sdkReady, mpPublicKey, precoUnitario, quantidade]);

  if (state.status === "aprovado" && state.orderId) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-semibold text-emerald-800">Pagamento aprovado!</p>
        <p className="mt-2 text-sm text-emerald-700">Seus ingressos já foram gerados.</p>
        <a
          href={`/pedido/${state.orderId}`}
          className="mt-4 inline-block font-medium text-emerald-900 underline"
        >
          Ver meus ingressos
        </a>
      </div>
    );
  }

  if (state.status === "pendente" && state.pixQrCodeBase64) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-center">
        <p className="font-semibold text-neutral-900">Escaneie o QR Code para pagar com PIX</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${state.pixQrCodeBase64}`}
          alt="QR Code PIX"
          className="mx-auto mt-4 h-56 w-56"
        />
        <p className="mt-4 text-xs text-neutral-500">Ou copie o código:</p>
        <textarea
          readOnly
          value={state.pixQrCode}
          className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-xs"
          rows={3}
        />
        <p className="mt-4 text-sm text-neutral-500">
          Assim que o pagamento for confirmado, seus ingressos aparecerão em{" "}
          <a href={`/pedido/${state.orderId}`} className="underline">
            meus ingressos
          </a>
          .
        </p>
      </div>
    );
  }

  const total = precoUnitario * quantidade;

  return (
    <>
      {mpPublicKey && (
        <Script
          src="https://sdk.mercadopago.com/js/v2"
          onLoad={() => setSdkReady(true)}
        />
      )}
      <form ref={formRef} id="form-checkout" action={formAction} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="event_id" value={eventId} />
        <input type="hidden" name="ticket_type_id" value={ticketTypeId} />
        <input type="hidden" name="card_token" />
        <input type="hidden" name="payment_method_id" />
        <input type="hidden" name="parcelas" defaultValue={1} />
        <input type="hidden" name="metodo_pagamento" value={metodo} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input
            id="quantidade"
            name="quantidade"
            type="number"
            min={1}
            max={maxPorPedido}
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(1, Math.min(maxPorPedido, Number(e.target.value))))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comprador_nome">Nome completo</Label>
            <Input id="comprador_nome" name="comprador_nome" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comprador_cpf">CPF</Label>
            <Input id="comprador_cpf" name="comprador_cpf" required inputMode="numeric" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comprador_email">E-mail (receberá o ingresso)</Label>
          <Input id="comprador_email" name="comprador_email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comprador_telefone">Telefone</Label>
          <Input id="comprador_telefone" name="comprador_telefone" inputMode="tel" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="metodo">Forma de pagamento</Label>
          <Select
            id="metodo"
            value={metodo}
            onChange={(e) => {
              tokenizedRef.current = false;
              setMetodo(e.target.value as "pix" | "credito");
            }}
          >
            <option value="pix">PIX</option>
            <option value="credito">Cartão de crédito</option>
          </Select>
        </div>

        {metodo === "credito" && (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
            <input id="form-checkout__cardNumber" />
            <div className="grid grid-cols-2 gap-3">
              <input id="form-checkout__expirationDate" />
              <input id="form-checkout__securityCode" />
            </div>
            <Input id="form-checkout__cardholderName" placeholder="Titular do cartão" />
            <Select id="form-checkout__issuer" />
            <Select id="form-checkout__installments" />
            <Select id="form-checkout__identificationType" />
            <Input id="form-checkout__identificationNumber" placeholder="CPF do titular" />
            <Input id="form-checkout__cardholderEmail" placeholder="E-mail do titular" />
          </div>
        )}

        <p className="text-sm text-neutral-500">
          Total: <span className="font-semibold text-neutral-900">{formatCurrency(total)}</span>
          {metodo === "credito" && " (o valor final com juros de parcelamento, se houver, é exibido acima)"}
        </p>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Processando..." : "Pagar"}
        </Button>
      </form>
    </>
  );
}
