import { Market, GroupedMarket } from "@/types";

const now = new Date();

function addMinutes(mins: number): string {
  return new Date(now.getTime() + mins * 60 * 1000).toISOString();
}

function addHours(hours: number): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function addDays(days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ── Daily market helpers ──────────────────────────────────────────────────────

/** Format a Date as "DD/MM" */
function displayDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

/**
 * Returns all close Dates that are currently inside their visibility window.
 *
 * Visibility rule:
 *   - A market for day D (closes at closeHour on D) appears at 18:00 on D-1
 *   - It is removed `removeAfterMins` minutes after closeHour on D
 *
 * This means from 18:00 today you see both today's AND tomorrow's markets
 * simultaneously, so there is always a "next" market in view.
 */
function getVisibleDailyCloseDates(closeHour: number, closeMin = 0, removeAfterMins = 1): Date[] {
  const result: Date[] = [];
  // Check today (D=+0) and tomorrow (D=+1) as candidates
  for (let offset = 0; offset <= 1; offset++) {
    const closeDate = new Date(now);
    closeDate.setDate(closeDate.getDate() + offset);
    closeDate.setHours(closeHour, closeMin, 0, 0);

    // Appears at 18:00 the day before the close date
    const appearAt = new Date(closeDate);
    appearAt.setDate(appearAt.getDate() - 1);
    appearAt.setHours(18, 0, 0, 0);

    const removeAt = new Date(closeDate.getTime() + removeAfterMins * 60 * 1000);

    if (now >= appearAt && now <= removeAt) result.push(closeDate);
  }
  return result;
}

export const markets: (Market | GroupedMarket)[] = [ // eslint-disable-line prefer-const
  // Live markets
  {
    id: "1",
    title: "Bitcoin: Sobe ou Desce? (em 5 minutos)",
    slug: "bitcoin-70k-5min",
    description:
      "O preço do Bitcoin (BTC/USD) vai subir ou cair nos próximos 5 minutos na Binance.",
    icon: "₿",
    imageUrl: "/images/bitcoin.png",
    category: "Criptomoedas",
    closesAt: addMinutes(3),
    live: 1,
    volume: 48320,
    matchingSystem: "binary",
    displayType: "crypto-live",
    selections: [
      { id: "s1", label: "Sobe", odd: 1.32, percent: 76, code: "SOBE", color: "#02BC17" },
      { id: "s2", label: "Desce", odd: 4.15, percent: 24, code: "DESCE", color: "#e23838" },
    ],
  },
  {
    id: "13",
    title: "Neymar Jr será convocado para a Copa do Mundo?",
    slug: "neymar-copa-2026",
    description:
      "Este mercado prevê se Neymar Jr. aparecerá na lista final de convocados oficial divulgada pela CBF até dia 09/06/2026.",
    icon: "⚽",
    imageUrl: "/images/neymar.jpg",
    category: "Esportes",
    closesAt: "2026-06-09T23:59:00.000Z",
    live: 0,
    volume: 184500,
    matchingSystem: "binary",
    displayType: "binary-poll",
    selections: [
      { id: "n1", label: "Sim", odd: 1.77, percent: 54, code: "SIM", color: "#02BC17" },
      { id: "n2", label: "Não", odd: 2.06, percent: 46, code: "NAO", color: "#e23838" },
    ],
  },
  {
    id: "3",
    title: "Rodovia: Quantos Carros? (em 5 minutos)",
    slug: "rodovia-castelo-branco-5min",
    description:
      "Monitoramento ao vivo da Rodovia Arão Sahm, KM 95 — Bragança Paulista (SP). Quantos carros serão contados pela IA nos próximos 5 minutos?",
    icon: "🚗",
    category: "Entretenimento",
    closesAt: addMinutes(4),
    live: 1,
    volume: 9870,
    matchingSystem: "binary",
    displayType: "live-count",
    selections: [
      { id: "s5", label: "Mais de 145", odd: 1.43, percent: 53, code: "MAIS", color: "#02BC17" },
      { id: "s6", label: "Até 145",     odd: 2.80, percent: 47, code: "ATE",  color: "#e23838" },
    ],
  },


  // Climate markets
  {
    id: "6",
    title: "Chove em São Paulo hoje?",
    slug: "chuva-sao-paulo-hoje",
    description:
      "Haverá precipitação pluviométrica na cidade de São Paulo hoje? Baseado em dados do INMET.",
    icon: "🌧️",
    category: "Clima",
    closesAt: addHours(18),
    live: 0,
    volume: 22400,
    matchingSystem: "binary",
    selections: [
      { id: "s11", label: "Sim", odd: 1.45, percent: 69, code: "SIM", color: "#02BC17" },
      { id: "s12", label: "Não", odd: 2.95, percent: 31, code: "NAO", color: "#e23838" },
    ],
  },
  {
    id: "7",
    title: "Temperatura máxima no RJ ultrapassa 35°C?",
    slug: "temperatura-rj-35c",
    description:
      "A temperatura máxima registrada na cidade do Rio de Janeiro hoje vai ultrapassar os 35 graus Celsius.",
    icon: "🌡️",
    category: "Clima",
    closesAt: addHours(14),
    live: 0,
    volume: 18700,
    matchingSystem: "binary",
    selections: [
      { id: "s13", label: "Sim", odd: 1.28, percent: 78, code: "SIM", color: "#02BC17" },
      { id: "s14", label: "Não", odd: 4.5, percent: 22, code: "NAO", color: "#e23838" },
    ],
  },

  // Finance markets
  {
    id: "8",
    title: "Preço do Diesel cai até o fim da semana?",
    slug: "diesel-preco-semana",
    description:
      "O preço médio do litro de Diesel nas bombas brasileiras vai cair até o fim desta semana, segundo ANP.",
    icon: "⛽",
    category: "Financeiro",
    closesAt: addDays(4),
    live: 0,
    volume: 34800,
    matchingSystem: "binary",
    selections: [
      { id: "s15", label: "Cai", odd: 2.3, percent: 43, code: "CAI", color: "#02BC17" },
      { id: "s16", label: "Mantém/Sobe", odd: 1.65, percent: 57, code: "SOBE", color: "#e23838" },
    ],
  },
  {
    id: "9",
    title: "PETR4 ou VALE3: qual sobe mais hoje?",
    slug: "petr4-vale3-hoje",
    description:
      "Entre as ações PETR4 (Petrobras) e VALE3 (Vale), qual terá maior valorização percentual ao fim do pregão hoje?",
    icon: "📈",
    category: "Financeiro",
    closesAt: addHours(6),
    live: 0,
    volume: 67200,
    matchingSystem: "multiple",
    selections: [
      { id: "s17", label: "PETR4", odd: 1.85, percent: 54, code: "PETR4", color: "#02BC17" },
      { id: "s18", label: "VALE3", odd: 2.1, percent: 46, code: "VALE3", color: "#3b82f6" },
    ],
  },
  {
    id: "10",
    title: "Dólar fecha acima de R$5,20 hoje?",
    slug: "dolar-520-hoje",
    description:
      "O dólar americano (USD/BRL) fechará o pregão desta sexta-feira acima de R$5,20 no mercado à vista.",
    icon: "💵",
    category: "Financeiro",
    closesAt: addHours(5),
    live: 0,
    volume: 88400,
    matchingSystem: "binary",
    selections: [
      { id: "s19", label: "Sim", odd: 1.62, percent: 62, code: "SIM", color: "#02BC17" },
      { id: "s20", label: "Não", odd: 2.65, percent: 38, code: "NAO", color: "#e23838" },
    ],
  },

  // Sports
  {
    id: "11",
    title: "Lakers vs Warriors - Quem vence?",
    slug: "lakers-warriors-nba",
    description:
      "Partida da NBA entre Los Angeles Lakers e Golden State Warriors. Quem levará a vitória nesta noite?",
    icon: "🏀",
    category: "Esportes",
    closesAt: addHours(3),
    live: 0,
    volume: 112500,
    matchingSystem: "binary",
    selections: [
      { id: "s21", label: "Lakers", odd: 2.15, percent: 47, code: "LAL", color: "#552583" },
      { id: "s22", label: "Warriors", odd: 1.78, percent: 53, code: "GSW", color: "#FFC72C" },
    ],
  },
  {
    id: "12",
    title: "Flamengo vence o próximo jogo?",
    slug: "flamengo-proximo-jogo",
    description:
      "O Clube de Regatas Flamengo conseguirá a vitória na próxima partida do Campeonato Brasileiro?",
    icon: "⚽",
    category: "Esportes",
    closesAt: addDays(2),
    live: 0,
    volume: 95300,
    matchingSystem: "multiple",
    selections: [
      { id: "s23", label: "Vitória", odd: 1.55, percent: 65, code: "VIT", color: "#02BC17" },
      { id: "s24", label: "Empate", odd: 3.8, percent: 21, code: "EMP", color: "#f59e0b" },
      { id: "s25", label: "Derrota", odd: 5.2, percent: 14, code: "DER", color: "#e23838" },
    ],
  },
];

// ── Dynamic daily market builders ────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function buildCarlinhosMarket(closeDate: Date): Market {
  const label = displayDate(closeDate);
  const key   = dateKey(closeDate);
  return {
    id: `carlinhos-${key}`,
    title: `Carlinhos Stories Ativos às 19h (${label})`,
    slug: `carlinhos-stories-19h-${key}`,
    description:
      "Este mercado prevê quantos stories estarão ativos (visíveis) no perfil da Carlinhos no momento exato das 19h.",
    icon: "🎙️",
    imageUrl: "/images/carlinhos.jpg",
    category: "Entretenimento",
    closesAt: closeDate.toISOString(),
    live: 0,
    volume: 130000,
    matchingSystem: "multiple",
    displayType: "stories-range",
    selections: [
      { id: "c1", label: "61 a 99",    odd: 1.63,  oddNao: 2.29, percent: 50, code: "61A99",  color: "#ec4899" },
      { id: "c2", label: "21 a 60",    odd: 2.28,  oddNao: 1.63, percent: 37, code: "21A60",  color: "#8b5cf6" },
      { id: "c3", label: "Mais de 99", odd: 10.98, oddNao: 1.04, percent: 8,  code: "MAIS99", color: "#3b82f6" },
      { id: "c4", label: "Até 20",     odd: 15.83, oddNao: 1.01, percent: 5,  code: "ATE20",  color: "#f59e0b" },
    ],
  } as Market;
}

function buildVirginiaMarket(closeDate: Date): GroupedMarket {
  const label = displayDate(closeDate);
  const key   = dateKey(closeDate);
  return {
    id: `virginia-${key}`,
    title: `Virginia Fonseca posta stories hoje? (${label})`,
    slug: `virginia-stories-hoje-${key}`,
    description:
      "A influenciadora Virginia Fonseca irá postar stories no Instagram hoje? Acompanhe ao vivo.",
    icon: "📱",
    category: "Entretenimento",
    closesAt: closeDate.toISOString(),
    live: 0,
    volume: 15600,
    matchingSystem: "binary",
    isGrouped: true,
    selections: [
      { id: "s7", label: "Sim", odd: 1.15, percent: 87, code: "SIM", color: "#02BC17" },
      { id: "s8", label: "Não", odd: 7.2,  percent: 13, code: "NAO", color: "#e23838" },
    ],
    groups: [
      {
        id: "g1",
        title: "Posta até as 12h",
        slug: "virginia-stories-manha",
        icon: "🌅",
        volume: 8200,
        percent: 42,
        selections: [
          { id: "gs1", label: "Sim", odd: 1.85, percent: 54, color: "#02BC17" },
          { id: "gs2", label: "Não", odd: 2.1,  percent: 46, color: "#e23838" },
        ],
      },
      {
        id: "g2",
        title: "Posta após as 18h",
        slug: "virginia-stories-tarde",
        icon: "🌆",
        volume: 7400,
        percent: 58,
        selections: [
          { id: "gs3", label: "Sim", odd: 1.42, percent: 70, color: "#02BC17" },
          { id: "gs4", label: "Não", odd: 3.5,  percent: 30, color: "#e23838" },
        ],
      },
    ],
  } as GroupedMarket;
}

function buildRioClimaMarket(closeDate: Date): Market {
  const label = displayDate(closeDate);
  const key   = dateKey(closeDate);
  return {
    id: `rio-clima-${key}`,
    title: `Rio de Janeiro atinge 31°C em ${label}?`,
    slug: `rio-temperatura-31c-${key}`,
    description:
      `Este mercado prevê se a temperatura máxima em Rio de Janeiro, RJ será igual ou superior a 31°C no dia ${label} até as 16:00h (horário de Brasília).`,
    imageUrl: "/images/riodejaneiro.png",
    category: "Clima",
    closesAt: closeDate.toISOString(),
    live: 0,
    volume: 28400,
    matchingSystem: "binary",
    displayType: "climate-daily",
    rules: [
      `Este mercado prevê se a temperatura máxima em Rio de Janeiro, RJ será igual ou superior a 31°C no dia ${label} até as 16:00h (horário de Brasília).`,
      `Esse mercado resolve: às 16:00:00 (BRT) de ${label} caso a temperatura máxima não seja atingida.`,
      `Fonte oficial: google.com/search?q=clima+Rio+de+Janeiro+RJ`,
      `• Sim: A fonte oficial registrar 31°C ou mais em algum momento do dia.`,
      `• Não: A fonte oficial não registrar 31°C em nenhum momento do dia.`,
    ],
    selections: [
      { id: `rio-sim-${key}`, label: "Sim", odd: 4.0,  percent: 24, code: "SIM", color: "#02BC17" },
      { id: `rio-nao-${key}`, label: "Não", odd: 1.25, percent: 76, code: "NAO", color: "#e23838" },
    ],
  } as Market;
}

// Inject all currently visible daily markets
// removeAfterMins = 1: mercado some 1 minuto após encerrar (padrão para todos os diários)
getVisibleDailyCloseDates(16, 0,  1).forEach(d => markets.push(buildRioClimaMarket(d)));
getVisibleDailyCloseDates(19, 0,  1).forEach(d => markets.push(buildCarlinhosMarket(d)));
getVisibleDailyCloseDates(23, 59, 1).forEach(d => markets.push(buildVirginiaMarket(d)));

export const categories = [
  "Todos",
  "Criptomoedas",
  "Financeiro",
  "Entretenimento",
  "Clima",
  "Esportes",
];
