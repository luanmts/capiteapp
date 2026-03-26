import { ChatMessage } from "@/types";

export const mockMessages: ChatMessage[] = [
  {
    id: "msg1",
    user: "CryptoLucas",
    message: "Bitcoin vai explodir agora! Tô dentro com R$200 no Sim 🚀",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "msg2",
    user: "Ana_Trader",
    message: "Cuidado, o suporte de 70k é fraco. Prefiro ficar no Não dessa vez",
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    id: "msg3",
    user: "Pedro_SP",
    message: "Alguém apostou no chuva em SP? Tô olhando o radar e parece que vem",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "msg4",
    user: "MariFinance",
    message: "PETR4 com notícia boa hoje cedo, coloquei tudo no PETR4 🛢️",
    timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
  },
  {
    id: "msg5",
    user: "JoaoRJ",
    message: "35 graus no RJ é certeza, nem coloco no Não haha faz dias que passa",
    timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    id: "msg6",
    user: "VitoriaBR",
    message: "Mercado do Lakers muito bom, odd 2.15 tá ótima pra quem acredita",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "msg7",
    user: "FlaFla2024",
    message: "Flamengo vence sim! Escalação boa hoje, Gabigol confirmado 🔴⚫",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "msg8",
    user: "CryptoLucas",
    message: "BTC subiu $500 nos últimos 2 minutos, quem tá no Sim tá feliz",
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: "msg9",
    user: "BetterBR",
    message: "Diesel vai subir semana que vem com o reajuste da Petrobras. Apostando em mantém/sobe",
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: "msg10",
    user: "TechTrader",
    message: "Dólar acima de 5,20 com certeza, inflação americana complicou tudo hoje",
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
];
