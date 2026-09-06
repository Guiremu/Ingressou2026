// Seed de dados mock reaproveitando os nomes/preços do protótipo do Claude Design.
// Rodar com: node scripts/seed.mjs (precisa de .env.local com as chaves do Supabase)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";

const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HMAC_SECRET = env.TICKET_HMAC_SECRET;
function signTicket(codigoQr, eventId) {
  return createHmac("sha256", HMAC_SECRET).update(`${codigoQr}:${eventId}`).digest("hex");
}

async function criarUsuario({ nome, cpf, email, telefone, role }) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
  if (existing) return existing.id;

  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password: "Ingressou@2026",
    email_confirm: true,
  });
  if (error) throw new Error(`Erro ao criar usuário ${email}: ${error.message}`);

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.user.id, nome, cpf, email, telefone, role });
  if (profileError) throw new Error(`Erro ao criar perfil ${email}: ${profileError.message}`);

  return user.user.id;
}

const IMG = {
  sertanejo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
  festivalRio: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
  teatro: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
  feira: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
  piseiro: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
  reveillon: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  arraia: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
  bannerV8: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80",
};

function futureDate(daysFromNow, hour = 22) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function pastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log("Criando produtores...");

  const v8ProfileId = await criarUsuario({
    nome: "Carlos Vieira",
    cpf: "11111111111",
    email: "v8producoes@ingressou.demo",
    telefone: "69991110001",
    role: "produtor",
  });
  const norteProfileId = await criarUsuario({
    nome: "Juliana Nascimento",
    cpf: "22222222222",
    email: "norteeventos@ingressou.demo",
    telefone: "69991110002",
    role: "produtor",
  });
  const selvaProfileId = await criarUsuario({
    nome: "Diego Farias",
    cpf: "33333333333",
    email: "selvamusic@ingressou.demo",
    telefone: "69991110003",
    role: "produtor",
  });
  const ciaPassoProfileId = await criarUsuario({
    nome: "Renata Costa",
    cpf: "44444444444",
    email: "ciapasso@ingressou.demo",
    telefone: "69991110004",
    role: "produtor",
  });
  const baladaXProfileId = await criarUsuario({
    nome: "Fábio Almeida",
    cpf: "55555555555",
    email: "baladax@ingressou.demo",
    telefone: "69991110005",
    role: "produtor",
  });

  async function upsertProducer(profileId, dados) {
    const { data: existing } = await supabase.from("producers").select("id").eq("slug", dados.slug).maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("producers")
      .insert({ profile_id: profileId, tipo_pessoa: "juridica", ...dados })
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao criar produtor ${dados.slug}: ${error.message}`);
    return data.id;
  }

  const v8Id = await upsertProducer(v8ProfileId, {
    cpf: "11111111111",
    cnpj: "11222333000181",
    razao_social: "V8 Produções de Eventos LTDA",
    nome_fantasia: "V8 Produções",
    slug: "v8producoes",
    status: "aprovado",
    cidade: "Ariquemes, RO",
    banner_url: IMG.bannerV8,
    descricao:
      "Produtora de shows e festivais em Rondônia desde 2016. Sertanejo, piseiro e eventos corporativos. Atendimento pelo WhatsApp de segunda a sexta.",
  });
  const norteId = await upsertProducer(norteProfileId, {
    cpf: "22222222222",
    cnpj: "22333444000182",
    razao_social: "Norte Eventos LTDA",
    nome_fantasia: "Norte Eventos",
    slug: "norteeventos",
    status: "aprovado",
    cidade: "Ariquemes, RO",
    descricao: "Festivais e eventos ao ar livre no norte de Rondônia.",
  });
  await upsertProducer(selvaProfileId, {
    cpf: "33333333333",
    cnpj: "33444555000183",
    razao_social: "Selva Music Produções LTDA",
    nome_fantasia: "Selva Music",
    slug: "selvamusic",
    status: "pendente",
    cidade: "Porto Velho, RO",
  });
  const ciaPassoId = await upsertProducer(ciaPassoProfileId, {
    cpf: "44444444444",
    cnpj: "44555666000184",
    razao_social: "Cia. Passo de Artes Cênicas LTDA",
    nome_fantasia: "Cia. Passo",
    slug: "ciapasso",
    status: "aprovado",
    cidade: "Ji-Paraná, RO",
    descricao: "Companhia de teatro itinerante, montagens clássicas e infantis.",
  });
  await upsertProducer(baladaXProfileId, {
    cpf: "55555555555",
    cnpj: "55666777000185",
    razao_social: "Balada X Entretenimento LTDA",
    nome_fantasia: "Balada X",
    slug: "baladax",
    status: "bloqueado",
    cidade: "Ariquemes, RO",
  });

  console.log("Criando eventos e lotes...");

  async function criarEvento(producerId, dados) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("producer_id", producerId)
      .eq("slug", dados.slug)
      .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("events")
      .insert({ producer_id: producerId, ...dados })
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao criar evento ${dados.slug}: ${error.message}`);
    return data.id;
  }

  async function criarLote(eventId, dados) {
    const { data: existing } = await supabase
      .from("ticket_types")
      .select("id, quantidade_vendida")
      .eq("event_id", eventId)
      .eq("nome", dados.nome)
      .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("ticket_types")
      .insert({ event_id: eventId, tipo: "pago", ...dados })
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao criar lote ${dados.nome}: ${error.message}`);
    return data.id;
  }

  // --- V8 Produções ---
  const baileId = await criarEvento(v8Id, {
    titulo: "Baile do Sertão — 3ª Edição",
    descricao:
      "Terceira edição do Baile do Sertão, com três atrações nacionais e open bar de chopp até meia-noite. Abertura dos portões às 21h. Evento para maiores de 18 anos; menores somente acompanhados dos pais com documento.",
    categoria: "Show",
    imagem_url: IMG.sertanejo,
    local: "Arena Vale",
    endereco: "Av. Capitão Sílvio, 2500",
    cidade: "Ariquemes, RO",
    data_inicio: futureDate(21),
    status: "publicado",
    slug: "baile-do-sertao-3",
  });
  const loteBailePista2 = await criarLote(baileId, {
    nome: "Pista — 2º lote",
    descricao: "Acesso à área de pista. Meia-entrada mediante comprovação.",
    preco: 60,
    quantidade_total: 400,
    max_por_pedido: 6,
  });
  await criarLote(baileId, {
    nome: "Front Stage VIP",
    descricao: "Área exclusiva em frente ao palco, com bar próprio.",
    preco: 120,
    quantidade_total: 60,
    max_por_pedido: 4,
  });
  await criarLote(baileId, {
    nome: "Pista — 3º lote",
    descricao: "Abre quando o 2º lote esgotar.",
    preco: 75,
    quantidade_total: 400,
    max_por_pedido: 6,
    data_inicio_venda: futureDate(15),
  });

  const piseiroId = await criarEvento(v8Id, {
    titulo: "Piseiro na Praça",
    descricao: "Noite de piseiro ao ar livre na Praça Central, com food trucks e bar.",
    categoria: "Show",
    imagem_url: IMG.piseiro,
    local: "Praça Central",
    endereco: "Praça Central, s/n",
    cidade: "Ariquemes, RO",
    data_inicio: futureDate(49),
    status: "publicado",
    slug: "piseiro-na-praca",
  });
  await criarLote(piseiroId, {
    nome: "Ingresso único",
    preco: 35,
    quantidade_total: 300,
    max_por_pedido: 8,
  });

  const reveillonId = await criarEvento(v8Id, {
    titulo: "Réveillon V8 — Pré-venda",
    descricao: "Pré-venda do Réveillon V8, com show de fogos e três palcos.",
    categoria: "Festa",
    imagem_url: IMG.reveillon,
    local: "Arena Vale",
    endereco: "Av. Capitão Sílvio, 2500",
    cidade: "Ariquemes, RO",
    data_inicio: futureDate(100),
    status: "rascunho",
    slug: "reveillon-v8-pre-venda",
  });
  await criarLote(reveillonId, {
    nome: "Pré-venda",
    preco: 90,
    quantidade_total: 500,
    max_por_pedido: 10,
  });

  const arraiaId = await criarEvento(v8Id, {
    titulo: "Arraiá do Vale",
    descricao: "Festa junina com quadrilha, comidas típicas e shows regionais.",
    categoria: "Festa",
    imagem_url: IMG.arraia,
    local: "Parque Ecológico",
    endereco: "Parque Ecológico, s/n",
    cidade: "Ariquemes, RO",
    data_inicio: pastDate(29),
    status: "encerrado",
    slug: "arraia-do-vale",
  });
  const loteArraia = await criarLote(arraiaId, {
    nome: "Ingresso único",
    preco: 55,
    quantidade_total: 1200,
    max_por_pedido: 10,
  });

  // --- Norte Eventos ---
  const festivalId = await criarEvento(norteId, {
    titulo: "Festival Beira do Jamari",
    descricao: "Festival de música à beira do rio Jamari, com atrações locais e nacionais.",
    categoria: "Festival",
    imagem_url: IMG.festivalRio,
    local: "Orla do Jamari",
    endereco: "Orla do Jamari, s/n",
    cidade: "Ariquemes, RO",
    data_inicio: futureDate(28),
    status: "publicado",
    slug: "festival-beira-do-jamari",
  });
  await criarLote(festivalId, {
    nome: "Ingresso único",
    preco: 45,
    quantidade_total: 800,
    max_por_pedido: 8,
  });

  const feiraId = await criarEvento(norteId, {
    titulo: "Feira Sabor do Norte",
    descricao: "Feira gastronômica com pratos típicos de toda a região Norte.",
    categoria: "Gastronomia",
    imagem_url: IMG.feira,
    local: "Centro de Eventos",
    endereco: "Centro de Eventos, s/n",
    cidade: "Ariquemes, RO",
    data_inicio: futureDate(35),
    status: "publicado",
    slug: "feira-sabor-do-norte",
  });
  await criarLote(feiraId, {
    nome: "Entrada gratuita",
    preco: 0,
    quantidade_total: 2000,
    max_por_pedido: 10,
  });

  // --- Cia. Passo ---
  const compadecidaId = await criarEvento(ciaPassoId, {
    titulo: "O Auto da Compadecida",
    descricao: "Adaptação teatral do clássico de Ariano Suassuna.",
    categoria: "Teatro",
    imagem_url: IMG.teatro,
    local: "Teatro Municipal",
    endereco: "Teatro Municipal, s/n",
    cidade: "Ji-Paraná, RO",
    data_inicio: futureDate(35),
    status: "publicado",
    slug: "o-auto-da-compadecida",
  });
  await criarLote(compadecidaId, {
    nome: "Ingresso único",
    preco: 30,
    quantidade_total: 250,
    max_por_pedido: 6,
  });

  console.log("Gerando pedidos de exemplo...");

  const compradores = [
    { nome: "Marina Alves Ribeiro", cpf: "02451788011", email: "marina.alves@email.com", telefone: "69992453310" },
    { nome: "Rafael Souza Lima", cpf: "11122233344", email: "rafael.lima@email.com", telefone: "69993334455" },
    { nome: "Ana Beatriz Melo", cpf: "22233344455", email: "ana.melo@email.com", telefone: "69994445566" },
    { nome: "Bruno Cardoso", cpf: "33344455566", email: "bruno.cardoso@email.com", telefone: "69995556677" },
    { nome: "Carla Nunes", cpf: "44455566677", email: "carla.nunes@email.com", telefone: "69996667788" },
  ];

  const vendidoPorLote = new Map();

  async function criarPedidoPago({ eventId, itens, comprador, diasAtras, algunsUsados }) {
    const valorIngressos = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const taxaPlataforma = Math.round(valorIngressos * 0.03 * 100) / 100;
    const taxaMp = Math.round(valorIngressos * 0.0099 * 100) / 100;
    const valorLiquido = Math.round((valorIngressos - taxaPlataforma - taxaMp) * 100) / 100;
    const criadoEm = pastDate(diasAtras);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        event_id: eventId,
        comprador_nome: comprador.nome,
        comprador_email: comprador.email,
        comprador_cpf: comprador.cpf,
        comprador_telefone: comprador.telefone,
        valor_ingressos: valorIngressos,
        valor_taxa_parcelamento: 0,
        valor_total_cobrado: valorIngressos,
        metodo_pagamento: "pix",
        parcelas: 1,
        status: "pago",
        criado_em: criadoEm,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao criar pedido: ${error.message}`);

    for (const item of itens) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        ticket_type_id: item.ticketTypeId,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
      });
      vendidoPorLote.set(item.ticketTypeId, (vendidoPorLote.get(item.ticketTypeId) ?? 0) + item.quantidade);

      for (let i = 0; i < item.quantidade; i++) {
        const codigoQr = randomUUID();
        const usado = algunsUsados && Math.random() > 0.4;
        const usadoEm = usado
          ? new Date(new Date(criadoEm).getTime() + Math.random() * 3 * 60 * 60 * 1000).toISOString()
          : null;
        await supabase.from("tickets").insert({
          order_id: order.id,
          ticket_type_id: item.ticketTypeId,
          event_id: eventId,
          codigo_qr: codigoQr,
          assinatura_hmac: signTicket(codigoQr, eventId),
          is_cortesia: false,
          status: usado ? "usado" : "valido",
          usado_em: usadoEm,
        });
      }
    }

    await supabase.from("payment_splits").insert({
      order_id: order.id,
      valor_bruto: valorIngressos,
      taxa_mp: taxaMp,
      taxa_plataforma: taxaPlataforma,
      valor_liquido_produtor: valorLiquido,
    });

    return order.id;
  }

  // Pedidos para o Baile do Sertão (evento futuro, mistura de válidos — sem check-in ainda)
  for (let i = 0; i < 4; i++) {
    await criarPedidoPago({
      eventId: baileId,
      itens: [{ ticketTypeId: loteBailePista2, preco: 60, quantidade: 2 }],
      comprador: compradores[i % compradores.length],
      diasAtras: 3 + i,
      algunsUsados: false,
    });
  }

  // Pedidos para o Arraiá do Vale (evento encerrado — todos com check-in já feito)
  for (let i = 0; i < 6; i++) {
    await criarPedidoPago({
      eventId: arraiaId,
      itens: [{ ticketTypeId: loteArraia, preco: 55, quantidade: 1 }],
      comprador: compradores[i % compradores.length],
      diasAtras: 30 + i,
      algunsUsados: true,
    });
  }

  console.log("Atualizando quantidade_vendida dos lotes...");
  for (const [ticketTypeId, quantidade] of vendidoPorLote.entries()) {
    await supabase.from("ticket_types").update({ quantidade_vendida: quantidade }).eq("id", ticketTypeId);
  }

  console.log("Seed concluído com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
