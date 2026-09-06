import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export default function SuportePage() {
  return (
    <LegalPage titulo="Suporte">
      <p>Precisa de ajuda? Aqui estão as respostas mais comuns.</p>

      <h2>Não recebi meu ingresso</h2>
      <p>
        Confira a caixa de spam do e-mail usado na compra. Se preferir, guarde o link do pedido
        (enviado logo após o pagamento) — ele leva direto para seus ingressos, em{" "}
        <Link href="/meus-ingressos" className="underline">Meus ingressos</Link> (se comprou logado) ou
        pelo link recebido por e-mail.
      </p>

      <h2>Meu pagamento não foi aprovado</h2>
      <p>
        Confira os dados do cartão ou tente outro meio de pagamento. Pagamentos recusados não geram
        cobrança e o ingresso volta a ficar disponível para compra.
      </p>

      <h2>Quero cancelar ou trocar meu ingresso</h2>
      <p>
        As condições de cancelamento e reembolso são definidas pelo produtor de cada evento — veja
        nossas <Link href="/regras" className="underline">regras de compra</Link>. Entre em contato
        diretamente com o produtor pela página do evento.
      </p>

      <h2>Sou produtor e quero vender na plataforma</h2>
      <p>
        Cadastre-se em{" "}
        <Link href="/cadastro/produtor" className="underline">
          Sou produtor
        </Link>
        . Seu cadastro passa por aprovação manual antes de publicar eventos e receber pagamentos.
      </p>

      <h2>Ainda com dúvidas?</h2>
      <p>Fale com a gente pelo e-mail suporte@ingressou.com.br.</p>
    </LegalPage>
  );
}
