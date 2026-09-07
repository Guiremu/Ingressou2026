import { requireLogin } from "@/lib/auth";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { PerfilForm } from "./perfil-form";
import { SenhaForm } from "./senha-form";

export default async function PerfilPage() {
  const profile = await requireLogin();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="font-[var(--font-sora)] text-2xl font-extrabold tracking-tight text-white">Meu perfil</h1>
        <p className="mt-1 text-[var(--text-muted)]">Gerencie seus dados de conta.</p>

        <PerfilForm nome={profile.nome} telefone={profile.telefone ?? ""} email={profile.email} cpf={profile.cpf} />
        <SenhaForm />
      </main>
    </div>
  );
}
