import { LegalPage } from "@/components/site/legal-page";

export default function SobrePage() {
  return (
    <LegalPage titulo="Sobre a ingressou">
      <p>
        A ingressou é uma plataforma regional de venda de ingressos que conecta produtores de
        eventos — shows, festivais, teatro, feiras e festas — ao público da sua cidade e região.
      </p>
      <p>
        Cuidamos da parte chata: checkout com PIX e cartão, split automático de pagamento,
        ingresso digital com QR Code assinado contra falsificação, e um painel completo para o
        produtor gerenciar vendas, cortesias e check-in na portaria — para que o organizador possa
        focar no que importa, o evento.
      </p>
      <h2>Como funciona</h2>
      <ul>
        <li>Produtores se cadastram e, após aprovação, publicam eventos e lotes de ingresso.</li>
        <li>Compradores encontram eventos da região na vitrine e compram sem precisar criar conta.</li>
        <li>Na portaria, o ingresso é validado por QR Code — pelo painel do produtor ou por um link de colaborador, sem necessidade de login.</li>
      </ul>
    </LegalPage>
  );
}
