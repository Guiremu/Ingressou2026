import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export default function TermosPage() {
  return (
    <LegalPage titulo="Termos de uso">
      <p>
        Estes Termos de Uso regulam o acesso e uso da plataforma ingressou, que conecta produtores
        de eventos a compradores de ingressos. Ao criar uma conta, cadastrar um evento ou comprar
        um ingresso, você concorda com estes termos.
      </p>

      <h2>1. O que a plataforma faz</h2>
      <p>
        A ingressou é um intermediário tecnológico: viabiliza a divulgação de eventos, a venda de
        ingressos e a validação de entrada por QR Code. A responsabilidade pela realização,
        qualidade, cancelamento ou alteração de um evento é sempre do produtor que o cadastrou —
        não da plataforma.
      </p>

      <h2>2. Cadastro e contas</h2>
      <ul>
        <li>Você é responsável por manter seus dados de cadastro (CPF, e-mail, telefone) corretos.</li>
        <li>Contas de produtor passam por aprovação manual antes de poderem publicar eventos e receber pagamentos.</li>
        <li>É proibido compartilhar credenciais de acesso ou usar a conta de terceiros.</li>
      </ul>

      <h2>3. Compra de ingressos</h2>
      <ul>
        <li>O ingresso é nominal e vinculado a um QR Code único — quem apresentar o código primeiro na portaria valida o acesso.</li>
        <li>Não compartilhe o link do seu ingresso ou capturas de tela do QR Code com terceiros.</li>
        <li>Preços, lotes e condições de meia-entrada são definidos pelo produtor de cada evento.</li>
      </ul>

      <h2>4. Cancelamentos e reembolsos</h2>
      <p>
        Em caso de cancelamento ou adiamento de um evento pelo produtor, o reembolso segue a
        política de reembolso divulgada na página do evento e as regras do Código de Defesa do
        Consumidor. Veja também nossas{" "}
        <Link href="/regras" className="underline">
          regras de compra
        </Link>
        .
      </p>

      <h2>5. Taxas</h2>
      <p>
        A plataforma retém uma taxa de serviço sobre o valor de cada ingresso vendido, informada no
        checkout antes da confirmação da compra.
      </p>

      <h2>6. Alterações</h2>
      <p>
        Podemos atualizar estes termos periodicamente. A versão vigente é sempre a publicada nesta
        página.
      </p>
    </LegalPage>
  );
}
