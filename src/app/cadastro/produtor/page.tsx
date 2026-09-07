import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { AuthCard } from "@/components/site/auth-card";
import { ProdutorForm } from "./produtor-form";

export default function CadastroProdutorPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <AuthCard
        title="Cadastro de produtor"
        subtitle="Todo cadastro passa por aprovação manual do Gestor ADM antes de publicar eventos."
        maxWidthClassName="max-w-md"
      >
        <ProdutorForm />
      </AuthCard>
    </div>
  );
}
