import { requireProducer } from "@/lib/producer";
import { getMpOAuthUrl } from "@/lib/mercadopago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { desconectarMercadoPago } from "./actions";

const ERROS: Record<string, string> = {
  parametros_invalidos: "A conexão foi cancelada ou expirou. Clique em conectar de novo.",
  oauth: "Não conseguimos confirmar a conexão com o Mercado Pago. Tente novamente.",
};

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const { producer } = await requireProducer();
  const { conectado: conectadoAgora, erro } = await searchParams;

  const conectado = Boolean(producer.mp_access_token);
  let oauthUrl: string | null = null;
  try {
    oauthUrl = getMpOAuthUrl(producer.id);
  } catch {
    oauthUrl = null;
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-[#263041] bg-[#0f141d] px-5 py-4">
        <h1 className="font-[var(--font-sora)] text-[19px] font-bold tracking-tight text-white">
          Conta e Mercado Pago
        </h1>
      </div>

      <div className="flex flex-col gap-[18px] px-5 py-[18px]">
        <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
          <h2 className="mb-3.5 font-[var(--font-sora)] text-base font-bold text-white">Dados cadastrais</h2>
          <div className="flex flex-col gap-1.5 text-sm text-[#93a0b8]">
            <p>Razão social: {producer.razao_social}</p>
            <p>{producer.tipo_pessoa === "juridica" ? `CNPJ: ${producer.cnpj}` : "Pessoa física"}</p>
            <p>CPF do responsável: {producer.cpf}</p>
            <p className="flex items-center gap-2">
              Status:{" "}
              <Badge variant={producer.status === "aprovado" ? "success" : producer.status === "pendente" ? "warning" : "destructive"}>
                {producer.status}
              </Badge>
            </p>
            <p>URL pública: /{producer.slug}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#263041] bg-[#121722] p-4.5">
          <h2 className="mb-1 font-[var(--font-sora)] text-base font-bold text-white">Recebimento dos pagamentos</h2>
          <p className="mb-3.5 text-sm text-[#93a0b8]">
            É pelo Mercado Pago que você recebe o dinheiro das vendas dos seus ingressos — a gente só fica com a
            taxa da plataforma (3%), o resto cai direto na sua conta. Você não precisa entender nada de integração
            nem copiar código nenhum: é só clicar e fazer login com a conta do Mercado Pago que você já usa hoje (a
            mesma do site ou do app).
          </p>

          {conectadoAgora === "1" && (
            <p className="mb-3 rounded-xl bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">
              Conta conectada com sucesso! Já pode receber pelos seus eventos.
            </p>
          )}
          {erro && (
            <p className="mb-3 rounded-xl bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
              {ERROS[erro] ?? "Não foi possível conectar. Tente novamente."}
            </p>
          )}

          {conectado ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="success">Conta conectada</Badge>
                {producer.mp_user_id && (
                  <span className="text-xs text-[#5d6b84]">ID da conta: {producer.mp_user_id}</span>
                )}
              </div>
              <p className="text-xs text-[#93a0b8]">
                Conectou a conta errada ou quer trocar? Desconecte e conecte de novo com a conta certa.
              </p>
              <form action={desconectarMercadoPago}>
                <Button type="submit" variant="outline">
                  Desconectar
                </Button>
              </form>
            </div>
          ) : producer.status !== "aprovado" ? (
            <p className="text-sm text-[#93a0b8]">Aguarde a aprovação do seu cadastro para conectar sua conta do Mercado Pago.</p>
          ) : oauthUrl ? (
            <a href={oauthUrl}>
              <Button>Conectar minha conta do Mercado Pago</Button>
            </a>
          ) : (
            <p className="text-sm text-[#93a0b8]">Integração com o Mercado Pago ainda não configurada na plataforma.</p>
          )}
        </div>
      </div>
    </div>
  );
}
