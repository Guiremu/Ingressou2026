import { Suspense } from "react";
import { SiteHeaderAsync } from "@/components/site/site-header-async";
import { AuthCard } from "@/components/site/auth-card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeaderAsync />
      <AuthCard title="Entrar" subtitle="Acesse com seu CPF, e-mail ou telefone.">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </div>
  );
}
