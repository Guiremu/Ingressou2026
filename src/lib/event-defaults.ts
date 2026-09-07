/** Cidades atendidas pela plataforma — lista fixa, pra manter o filtro da vitrine consistente. */
export const CIDADES_ATENDIDAS = [
  "Ariquemes, RO",
  "Porto Velho, RO",
  "Ji-Paraná, RO",
  "Cacoal, RO",
  "Vilhena, RO",
  "Jaru, RO",
  "Rolim de Moura, RO",
  "Guajará-Mirim, RO",
];

/** Categorias de evento — lista fixa, pra manter o filtro da vitrine consistente. */
export const CATEGORIAS_EVENTO = [
  "Show",
  "Festa",
  "Festival",
  "Teatro",
  "Gastronomia",
  "Esporte",
  "Palestra",
  "Outro",
];

/**
 * Texto padrão de política de reembolso, preenchido automaticamente em todo evento novo
 * (o produtor pode editar depois em "Editar evento") — assim ele não precisa escrever do
 * zero, só ajustar o que for diferente do padrão da plataforma.
 */
export const POLITICA_REEMBOLSO_PADRAO = `Em caso de cancelamento do evento pelo produtor, o valor pago é reembolsado integralmente em até 7 dias úteis.

Desistência do comprador: reembolso não é garantido, salvo nos casos previstos no Código de Defesa do Consumidor (ex: compra feita nas últimas 24h antes do evento, direito de arrependimento em compras online até 7 dias após a compra, desde que solicitado antes da data do evento).

Em caso de adiamento, os ingressos continuam válidos para a nova data. Quem não puder comparecer pode solicitar reembolso em até 7 dias após o anúncio da nova data.

Dúvidas sobre reembolso: entre em contato pelo suporte da plataforma.`;
