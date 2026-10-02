import type { ProfileCode } from './types.js';

/**
 * Leitura de cada combinação ORDENADA (principal + secundário): DI e ID são textos diferentes, porque o fator
 * principal guia o jeito de agir e o secundário o modula.
 *
 * ATENÇÃO: texto original do projeto, ainda NÃO revisado por profissional de RH/psicologia.
 * O nome da combinação (ex.: "Dominância com Influência") é derivado dos fatores em content.ts.
 */
export interface CombinedContent {
  headline: string;
  /** Voz do candidato ("Você..."). */
  description: string;
  strengths: string[];
  tips: string[];
  communication: string;
  attention: string[];
  idealEnvironment: string;
  motivators: string[];
  interviewQuestions: string[];
}

export const COMBINED_CONTENT: Record<ProfileCode, CombinedContent> = {
  DI: {
    headline: 'Decisão com carisma',
    description:
      'Você combina iniciativa e foco em resultado com facilidade para mobilizar pessoas. Costuma liderar pela energia e pela persuasão, e gosta de ver o impacto das suas decisões.',
    strengths: [
      'Liderança que inspira',
      'Iniciativa com poder de persuasão',
      'Energia para fazer as coisas acontecerem',
    ],
    tips: [
      'Reserve tempo para os detalhes e para o acompanhamento depois do entusiasmo inicial',
      'Ouça mais antes de convencer',
    ],
    communication: 'Direta e envolvente; vai ao ponto, mas busca engajar.',
    attention: [
      'Pode atropelar o ritmo de quem precisa de mais tempo',
      'Pode prometer mais do que consegue acompanhar',
    ],
    idealEnvironment: 'Autonomia, desafios, visibilidade e equipes dinâmicas.',
    motivators: ['Resultados visíveis', 'Reconhecimento', 'Autonomia'],
    interviewQuestions: [
      'Conte uma vez em que você convenceu um grupo a seguir uma direção difícil.',
      'Como você garante a execução depois de engajar as pessoas?',
    ],
  },
  DS: {
    headline: 'Firmeza com constância',
    description:
      'Você busca resultados com persistência e equilíbrio: age com determinação, mas sem pressa desnecessária, e valoriza a lealdade e a previsibilidade da equipe.',
    strengths: ['Determinação com calma', 'Persistência até concluir', 'Confiabilidade em momentos de pressão'],
    tips: ['Compartilhe o que pensa antes de a tensão acumular', 'Aceite mudanças de rota rápidas quando necessário'],
    communication: 'Direta e tranquila; fala pouco, mas com firmeza.',
    attention: ['Pode resistir a mudanças que não escolheu', 'Pode guardar insatisfações em vez de expor cedo'],
    idealEnvironment: 'Metas claras, ritmo constante e equipe estável.',
    motivators: ['Conquistas consistentes', 'Segurança no que constrói', 'Autonomia dentro de uma rotina'],
    interviewQuestions: [
      'Conte um caso em que você manteve um objetivo por muito tempo apesar de obstáculos.',
      'Como você reage quando uma decisão sua é mudada de última hora?',
    ],
  },
  DC: {
    headline: 'Resultado com rigor',
    description:
      'Você une foco em resultados à exigência com a qualidade: decide com firmeza, mas apoiado em dados e em padrões claros.',
    strengths: ['Decisão baseada em análise', 'Alto padrão de qualidade', 'Foco em metas mensuráveis'],
    tips: [
      'Aceite decisões "boas o bastante" quando o tempo for curto',
      'Dê mais espaço para a opinião e o ritmo da equipe',
    ],
    communication: 'Objetiva e precisa; espera a mesma clareza dos outros.',
    attention: ['Pode ser exigente demais consigo e com os outros', 'Pode parecer frio ou crítico'],
    idealEnvironment: 'Autonomia, padrões claros e responsabilidade por resultados.',
    motivators: ['Excelência', 'Resultados mensuráveis', 'Autonomia técnica'],
    interviewQuestions: [
      'Conte uma decisão importante que você tomou usando dados e como mediu o resultado.',
      'Como você reage quando alguém entrega abaixo do padrão que você espera?',
    ],
  },
  ID: {
    headline: 'Entusiasmo com iniciativa',
    description:
      'Você se destaca pela comunicação e pelo relacionamento, e também age com decisão quando precisa. Atrai as pessoas primeiro e toma a frente em seguida.',
    strengths: ['Comunicação carismática', 'Capacidade de mobilizar equipes', 'Coragem para assumir a frente'],
    tips: ['Defina prioridades para não abrir muitas frentes', 'Registre combinados e prazos por escrito'],
    communication: 'Expressiva e animada, com firmeza quando o assunto exige.',
    attention: ['Pode se dispersar entre muitas iniciativas', 'Pode ser impulsivo ao decidir movido pelo entusiasmo'],
    idealEnvironment: 'Variedade, contato com pessoas e liberdade para propor e liderar.',
    motivators: ['Reconhecimento público', 'Novos desafios', 'Relacionamentos'],
    interviewQuestions: [
      'Dê um exemplo de projeto que você liderou e como manteve o foco até o fim.',
      'Como você lida quando precisa decidir sem o apoio do grupo?',
    ],
  },
  IS: {
    headline: 'Acolhimento e conexão',
    description:
      'Você constrói relações com facilidade e cuida das pessoas: é comunicativo, mas também paciente e leal, e ajuda a manter o clima da equipe.',
    strengths: ['Empatia e escuta', 'Construção de vínculos de confiança', 'Clima positivo na equipe'],
    tips: [
      'Diga "não" com mais frequência quando precisar proteger seu tempo',
      'Busque feedback direto em vez de evitar conflitos',
    ],
    communication: 'Calorosa e receptiva; valoriza a conversa e a harmonia.',
    attention: ['Pode evitar conversas difíceis', 'Pode ter dificuldade para cobrar resultados'],
    idealEnvironment: 'Equipe unida, reconhecimento pessoal e rotina previsível.',
    motivators: ['Pertencimento', 'Reconhecimento', 'Harmonia'],
    interviewQuestions: [
      'Conte uma vez em que você precisou dar um feedback difícil a alguém próximo.',
      'Como você lida quando o grupo está dividido?',
    ],
  },
  IC: {
    headline: 'Comunicação com cuidado',
    description:
      'Você combina a facilidade de se relacionar com atenção à qualidade: comunica com clareza e entusiasmo e se preocupa em fazer as coisas direito.',
    strengths: [
      'Comunicação clara e envolvente',
      'Atenção à imagem e à qualidade',
      'Facilidade para explicar ideias complexas',
    ],
    tips: [
      'Equilibre a busca por aprovação com decisões firmes',
      'Evite o perfeccionismo antes de apresentar o trabalho',
    ],
    communication: 'Expressiva e organizada; gosta de preparar o que vai dizer.',
    attention: ['Pode oscilar entre agradar e ser rigoroso', 'Pode se frustrar com improviso'],
    idealEnvironment: 'Contato com pessoas, padrões claros e reconhecimento pela qualidade.',
    motivators: ['Reconhecimento', 'Qualidade percebida', 'Relacionamentos'],
    interviewQuestions: [
      'Conte como você preparou uma apresentação importante e a adaptou ao público.',
      'Como você lida com feedback crítico sobre algo que apresentou?',
    ],
  },
  SD: {
    headline: 'Constância com firmeza',
    description:
      'Você é estável e confiável e, quando é preciso, sabe se posicionar: mantém o ritmo da equipe e defende com firmeza o que considera importante.',
    strengths: ['Confiabilidade com firmeza', 'Persistência e senso de dever', 'Proteção da equipe quando necessário'],
    tips: ['Fale mais cedo sobre o que te incomoda', 'Experimente decidir mais rápido em situações novas'],
    communication: 'Calma e firme; fala pouco, mas com posição clara.',
    attention: ['Pode ser teimoso quando contrariado', 'Pode demorar a reagir e então reagir de uma vez'],
    idealEnvironment: 'Rotina estável, papel claro e respeito ao ritmo de trabalho.',
    motivators: ['Segurança', 'Lealdade', 'Autoridade sobre o próprio trabalho'],
    interviewQuestions: [
      'Conte uma situação em que você manteve uma posição impopular com calma.',
      'Como você reage quando alguém desrespeita um combinado importante?',
    ],
  },
  SI: {
    headline: 'Apoio com simpatia',
    description:
      'Você é uma presença constante e confiável e também sabe se comunicar bem: apoia os colegas com paciência e cria um ambiente acolhedor.',
    strengths: ['Constância e lealdade', 'Boa escuta e comunicação gentil', 'Capacidade de mediar situações'],
    tips: ['Proponha ideias mesmo quando ninguém pedir', 'Peça ajuda cedo em vez de absorver todas as demandas'],
    communication: 'Gentil e paciente, com abertura ao diálogo.',
    attention: ['Pode ter dificuldade em se posicionar', 'Pode assumir tarefas demais para agradar'],
    idealEnvironment: 'Equipes estáveis, confiança mútua e poucas mudanças bruscas.',
    motivators: ['Segurança', 'Boas relações', 'Sentir-se útil'],
    interviewQuestions: [
      'Como você se posiciona quando discorda de um colega de quem gosta?',
      'Conte como você ajudou a equipe a se adaptar a uma mudança.',
    ],
  },
  SC: {
    headline: 'Constância com precisão',
    description:
      'Você é calmo, cuidadoso e confiável: trabalha com método, mantém o ritmo e entrega com qualidade, sem alarde.',
    strengths: ['Consistência e disciplina', 'Cuidado com a qualidade', 'Cooperação discreta'],
    tips: ['Compartilhe o que sabe, não apenas o que é pedido', 'Treine decisões mais rápidas em cenários incertos'],
    communication: 'Calma e detalhada; prefere combinar por escrito.',
    attention: ['Pode resistir a mudanças e improvisos', 'Pode demorar a se manifestar'],
    idealEnvironment: 'Processos claros, rotina estável e tempo para fazer bem feito.',
    motivators: ['Estabilidade', 'Qualidade', 'Reconhecimento pela dedicação'],
    interviewQuestions: [
      'Conte como você lidou com uma mudança de processo que considerava arriscada.',
      'Como você decide quando já fez a verificação suficiente?',
    ],
  },
  CD: {
    headline: 'Análise com decisão',
    description:
      'Você analisa com profundidade e age com firmeza: busca a resposta certa e assume a responsabilidade de decidir e cobrar resultado.',
    strengths: [
      'Análise crítica e capacidade de decidir',
      'Alto padrão e autonomia',
      'Foco em resultado com qualidade',
    ],
    tips: ['Reconheça o esforço dos outros, não só o resultado', 'Delegue sem refazer o trabalho depois'],
    communication: 'Direta e fundamentada; vai aos fatos.',
    attention: ['Pode ser inflexível com os próprios padrões', 'Pode ser visto como distante ou crítico'],
    idealEnvironment: 'Autonomia, desafios técnicos e metas claras.',
    motivators: ['Excelência', 'Autonomia', 'Resolver problemas difíceis'],
    interviewQuestions: [
      'Conte um caso em que você discordou da maioria e como sustentou sua posição.',
      'Como você ajusta seu nível de exigência com pessoas menos experientes?',
    ],
  },
  CI: {
    headline: 'Rigor com expressão',
    description:
      'Você prioriza análise e padrões e consegue comunicar bem o que descobre: é criterioso, mas também abre espaço para as pessoas.',
    strengths: [
      'Análise com boa comunicação',
      'Preparo e atenção a detalhes',
      'Capacidade de explicar de forma convincente',
    ],
    tips: ['Mostre mais cedo o que está em andamento', 'Aceite opiniões menos estruturadas do grupo'],
    communication: 'Precisa e cordial; usa dados para convencer.',
    attention: ['Pode ser autocrítico demais', 'Pode hesitar em se expor sem preparo completo'],
    idealEnvironment: 'Padrões claros, ambiente colaborativo e espaço para apresentar ideias.',
    motivators: ['Excelência', 'Reconhecimento técnico', 'Colaboração'],
    interviewQuestions: [
      'Conte uma vez em que você convenceu alguém usando dados.',
      'Como você lida quando precisa decidir sem ter analisado tudo?',
    ],
  },
  CS: {
    headline: 'Método com paciência',
    description:
      'Você prioriza a qualidade e a análise, com um jeito paciente e cooperativo: investiga com calma e ajuda a equipe a trabalhar com consistência.',
    strengths: ['Análise cuidadosa', 'Paciência para fazer direito', 'Confiabilidade nos prazos'],
    tips: ['Divida o que descobre com mais frequência', 'Aceite versões imperfeitas para ganhar velocidade'],
    communication: 'Precisa e tranquila; explica o raciocínio passo a passo.',
    attention: ['Pode ser lento para decidir', 'Pode evitar riscos que valeriam a pena'],
    idealEnvironment: 'Padrões claros, ambiente calmo e tempo para analisar.',
    motivators: ['Precisão', 'Previsibilidade', 'Estabilidade da equipe'],
    interviewQuestions: [
      'Conte um problema complexo que você resolveu com método.',
      'Como você decide quando há pouco tempo e informação incompleta?',
    ],
  },
};
