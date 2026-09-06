import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SucessoPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Cadastro enviado!</CardTitle>
          <CardDescription>
            Sua conta de produtor foi criada e está aguardando aprovação do Gestor ADM. Você
            receberá um e-mail assim que for aprovado e poderá então conectar sua conta do
            Mercado Pago e publicar eventos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="font-medium text-white underline">
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
