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
 * Regra de negócio (ver seção 3 da especificação):
 * - À vista (PIX ou crédito 1x): a taxa do MP é descontada do produtor, junto com os 3% da plataforma.
 * - Parcelado (2x+): o acréscimo do parcelamento é somado ao valor cobrado do cliente, sem afetar
 *   o repasse do produtor (que recebe o valor do ingresso menos apenas os 3% da plataforma) nem o
 *   lucro da plataforma (que continua recebendo exatamente 3% do valor original do ingresso).
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
  const { valorIngressos, metodoPagamento, parcelas, taxaMpPercentual, taxaPlataformaPercentual } = params;
  const taxaPlataforma = round2(valorIngressos * taxaPlataformaPercentual);
  const aVista = metodoPagamento === "pix" || parcelas <= 1;

  if (aVista) {
    const taxaMp = round2(valorIngressos * taxaMpPercentual);
    const valorLiquidoProdutor = round2(valorIngressos - taxaMp - taxaPlataforma);
    return {
      valorIngressos,
      valorTaxaParcelamento: 0,
      valorTotalCobrado: valorIngressos,
      taxaMp,
      taxaPlataforma,
      valorLiquidoProdutor,
      applicationFee: taxaPlataforma,
    };
  }

  // Gross-up: o cliente absorve integralmente a taxa de parcelamento do MP sobre o total cobrado,
  // de forma que produtor e plataforma dividam o valor original do ingresso sem perdas.
  const valorTotalCobrado = round2(valorIngressos / (1 - taxaMpPercentual));
  const taxaMp = round2(valorTotalCobrado - valorIngressos);
  const valorLiquidoProdutor = round2(valorIngressos - taxaPlataforma);

  return {
    valorIngressos,
    valorTaxaParcelamento: taxaMp,
    valorTotalCobrado,
    taxaMp,
    taxaPlataforma,
    valorLiquidoProdutor,
    applicationFee: taxaPlataforma,
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
