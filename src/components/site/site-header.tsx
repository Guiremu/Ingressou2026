import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          ingressou
        </Link>
        <nav className="flex items-center gap-3">
          {profile ? (
            <>
              {(profile.role === "produtor" || profile.role === "colaborador") && (
                <Link href="/produtor">
                  <Button variant="outline" size="sm">
                    Portal do Produtor
                  </Button>
                </Link>
              )}
              {profile.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Gestor ADM
                  </Button>
                </Link>
              )}
              <form action="/logout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/cadastro/produtor">
                <Button variant="ghost" size="sm">
                  Sou produtor
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Entrar
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
