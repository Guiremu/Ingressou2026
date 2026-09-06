import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export default function PrivacidadePage() {
  return (
    <LegalPage titulo="Política de privacidade">
      <p>
        Esta política explica como a ingressou coleta, usa e protege seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>Dados de cadastro: nome, CPF, e-mail e telefone.</li>
        <li>Dados de compra: nome do comprador, CPF, e-mail e telefone informados no checkout.</li>
        <li>Dados de pagamento são processados diretamente pelo Mercado Pago — não armazenamos números de cartão.</li>
        <li>Dados de uso: acesso a páginas, validações de ingresso e ações realizadas nos portais.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Processar compras, emitir ingressos e validar o acesso a eventos.</li>
        <li>Comunicar sobre pedidos, eventos e alterações importantes.</li>
        <li>Cumprir obrigações legais e prevenir fraudes.</li>
      </ul>

      <h2>3. Compartilhamento</h2>
      <p>
        Compartilhamos dados com o produtor do evento (para a gestão da portaria e atendimento) e
        com o Mercado Pago (para processar o pagamento). Não vendemos dados pessoais a terceiros.
      </p>

      <h2>4. Seus direitos</h2>
      <p>
        Você pode acessar, corrigir ou solicitar a exclusão dos seus dados a qualquer momento pela
        página <Link href="/perfil" className="underline">Meu perfil</Link> ou entrando em contato pelo{" "}
        <Link href="/suporte" className="underline">suporte</Link>.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Utilizamos controles de acesso por papel (produtor, colaborador, administrador) e row-level
        security no banco de dados, além de assinatura criptográfica nos QR Codes dos ingressos
        para impedir falsificação.
      </p>
    </LegalPage>
  );
}
