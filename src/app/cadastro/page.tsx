import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { AuthCard } from "@/components/site/auth-card";
import { CadastroForm } from "./cadastro-form";

export default function CadastroPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <AuthCard title="Criar conta" subtitle="Cadastre-se para comprar ingressos com mais agilidade.">
        <CadastroForm />
      </AuthCard>
    </div>
  );
}
