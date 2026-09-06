import { requireProducer } from "@/lib/producer";
import { getMpOAuthUrl } from "@/lib/mercadopago";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ContaPage() {
  const { producer } = await requireProducer();

  const conectado = Boolean(producer.mp_access_token);
  let oauthUrl: string | null = null;
  try {
    oauthUrl = getMpOAuthUrl(producer.id);
  } catch {
    oauthUrl = null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Conta e Mercado Pago</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-neutral-700">
          <p>Razão social: {producer.razao_social}</p>
          <p>{producer.tipo_pessoa === "juridica" ? `CNPJ: ${producer.cnpj}` : "Pessoa física"}</p>
          <p>CPF do responsável: {producer.cpf}</p>
          <p>
            Status: <Badge variant={producer.status === "aprovado" ? "success" : producer.status === "pendente" ? "warning" : "destructive"}>{producer.status}</Badge>
          </p>
          <p>URL pública: /{producer.slug}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mercado Pago</CardTitle>
          <CardDescription>
            Conecte sua conta do Mercado Pago para receber os pagamentos dos seus eventos
            diretamente, com o repasse automático descontando apenas a taxa da plataforma (3%).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conectado ? (
            <Badge variant="success">Conta conectada</Badge>
          ) : producer.status !== "aprovado" ? (
            <p className="text-sm text-neutral-500">
              Aguarde a aprovação do seu cadastro para conectar sua conta do Mercado Pago.
            </p>
          ) : oauthUrl ? (
            <a href={oauthUrl}>
              <Button>Conectar conta do Mercado Pago</Button>
            </a>
          ) : (
            <p className="text-sm text-neutral-500">
              Integração com o Mercado Pago ainda não configurada na plataforma.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
