import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export default function RegrasPage() {
  return (
    <LegalPage titulo="Regras de compra">
      <h2>Antes de comprar</h2>
      <ul>
        <li>Confira nome, CPF e e-mail antes de finalizar — o ingresso é enviado para o e-mail informado.</li>
        <li>Cada lote tem uma quantidade máxima por pedido, exibida na ficha do evento.</li>
        <li>Meia-entrada e demais condições especiais são definidas pelo produtor e podem exigir comprovação na portaria.</li>
      </ul>

      <h2>Proteção do ingresso</h2>
      <ul>
        <li>O ingresso é um QR Code único — quem apresentar primeiro na portaria valida a entrada.</li>
        <li>Não compartilhe o link do ingresso nem tire e envie print do QR Code para outras pessoas.</li>
        <li>Um ingresso já validado não pode ser usado novamente.</li>
      </ul>

      <h2>Pagamento</h2>
      <ul>
        <li>Aceitamos PIX (aprovação imediata) e cartão de crédito, em até 12x.</li>
        <li>No PIX o QR de pagamento vale por tempo limitado — gerou e não pagou, o pedido é cancelado e o ingresso liberado para outra pessoa.</li>
        <li>No parcelamento, o acréscimo de juros da parcela é exibido antes da confirmação.</li>
      </ul>

      <h2>Cancelamento e reembolso</h2>
      <p>
        Cada evento tem sua própria política de reembolso, definida pelo produtor. Em caso de
        cancelamento do evento, o reembolso é processado conforme essa política e as regras do
        Código de Defesa do Consumidor. Em caso de dúvida, fale com o{" "}
        <Link href="/suporte" className="underline">suporte</Link>.
      </p>

      <h2>Check-in</h2>
      <p>
        Chegue com antecedência. A portaria valida o ingresso pelo QR Code — tenha o e-mail ou o
        link do ingresso disponível no celular no momento da entrada.
      </p>
    </LegalPage>
  );
}
