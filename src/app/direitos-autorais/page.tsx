import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";
import { anoAtual } from "@/lib/utils";

export default function DireitosAutoraisPage() {
  return (
    <LegalPage titulo="Direitos autorais">
      <p>
        © {anoAtual()} ingressou. Todos os direitos reservados.
      </p>
      <p>
        A plataforma <strong>ingressou</strong> — incluindo sua marca, identidade visual, layout,
        código-fonte, banco de dados e toda a documentação associada — é de propriedade de{" "}
        <strong>Guilherme Falcão Silvestre de Jesus</strong> (Guilherme Silvestre), sendo protegida
        pela legislação brasileira de direitos autorais (Lei nº 9.610/1998) e de propriedade
        industrial (Lei nº 9.279/1996).
      </p>
      <h2>O que isso significa</h2>
      <ul>
        <li>
          É proibida a reprodução, cópia, engenharia reversa, distribuição ou uso comercial de
          qualquer parte do site, do sistema ou da marca ingressou sem autorização prévia e por
          escrito.
        </li>
        <li>
          O conteúdo enviado por produtores (textos, imagens de eventos, nomes e marcas) permanece
          de propriedade de quem o enviou — a ingressou apenas hospeda e exibe esse conteúdo para
          viabilizar a venda de ingressos.
        </li>
        <li>
          Nomes, logotipos e marcas de terceiros eventualmente exibidos na plataforma pertencem aos
          seus respectivos titulares.
        </li>
      </ul>
      <h2>Créditos</h2>
      <p>
        Idealizado, desenvolvido e mantido por <strong>Guilherme Silvestre</strong> (Guilherme
        Falcão Silvestre de Jesus).
      </p>
      <h2>Contato</h2>
      <p>
        Dúvidas sobre uso de conteúdo, licenciamento ou direitos autorais podem ser encaminhadas
        pela página de <Link href="/suporte" className="underline">suporte</Link>.
      </p>
    </LegalPage>
  );
}
