import type { PaymentMethod } from "@/types/database";

export interface SplitCalculo {
  valorIngressos: number;
  valorTaxaParcelamento: number;
  valorTotalCobrado: number;
  taxaMp: number;
  taxaPlataforma: number;
  valorLiquidoProdutor: number;
  /** Valor enviado como `application_fee` na criação do pagamento — sempre 3% do valor do ingresso. */
  applicationFee: number;
}

/**
 * Regra de negócio: a taxa do Mercado Pago (PIX ou parcelamento) e a taxa da
 * plataforma (3%) são sempre somadas ao valor cobrado do comprador, de forma 100%
 * transparente — nunca descontadas do produtor. O produtor sempre recebe o valor
 * cheio dos ingressos; a plataforma sempre recebe exatamente os 3% via
 * `application_fee`; o comprador absorve o restante (a taxa do MP).
 *
 * Gross-up: valorTotalCobrado é calculado de forma que, depois do MP descontar sua
 * taxa percentual sobre o total cobrado, sobre exatamente valorIngressos + taxaPlataforma
 * pra platform+produtor.
 *
 * Função pura (sem I/O) — importada tanto pelo servidor (checkout, webhook) quanto pelo
 * client component do checkout (para exibir o resumo em tempo real antes de submeter).
 */
export function calculateSplit(params: {
  valorIngressos: number;
  metodoPagamento: PaymentMethod;
  parcelas: number;
  taxaMpPercentual: number;
  taxaPlataformaPercentual: number;
}): SplitCalculo {
  const { valorIngressos, taxaMpPercentual, taxaPlataformaPercentual } = params;
  const taxaPlataforma = round2(valorIngressos * taxaPlataformaPercentual);

  const valorTotalCobrado = round2((valorIngressos + taxaPlataforma) / (1 - taxaMpPercentual));
  const taxaMp = round2(valorTotalCobrado - valorIngressos - taxaPlataforma);

  return {
    valorIngressos,
    valorTaxaParcelamento: taxaMp,
    valorTotalCobrado,
    taxaMp,
    taxaPlataforma,
    valorLiquidoProdutor: valorIngressos,
    applicationFee: taxaPlataforma,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
