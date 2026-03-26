export interface Step {
  number: number;
  title: string;
  description: string;
  image: string;
  cta: string;
}

export const STEPS: Step[] = [
  {
    number: 1,
    title: "1. Escolha um mercado",
    description:
      "Selecione um mercado ativo e escolha o resultado que você acredita que vai acontecer. As probabilidades mudam em tempo real conforme a atividade dos usuários.",
    image: "/images/how-it-works/step-1.png",
    cta: "Próximo",
  },
  {
    number: 2,
    title: "2. Faça sua previsão",
    description:
      "Escolha entre as opções disponíveis, defina o valor e confirme sua entrada. Você verá o possível retorno antes de concluir.",
    image: "/images/how-it-works/step-2.png",
    cta: "Próximo",
  },
  {
    number: 3,
    title: "3. Acompanhe o resultado",
    description:
      "Depois de entrar, acompanhe a evolução do mercado em tempo real. Se acertar a previsão, você recebe o retorno correspondente.",
    image: "/images/how-it-works/step-3.png",
    cta: "Começar",
  },
];
