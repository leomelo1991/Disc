import { COMBINED_CONTENT } from './combined-content.js';
import type { Factor, Profile, ProfileCode } from './types.js';

export { COMBINED_CONTENT, type CombinedContent } from './combined-content.js';

export interface FactorContent {
  name: string;
  headline: string;
  description: string;
  strengths: string[];
  tips: string[];
  communication: string;
  attention: string[];
  idealEnvironment: string;
  motivators: string[];
  interviewQuestions: string[];
}

export const FACTOR_CONTENT: Record<Factor, FactorContent> = {
  D: {
    name: 'Dominância',
    headline: 'Foco em resultados e decisão',
    description: 'Você tende a agir com rapidez, assumir desafios e buscar resultados concretos.',
    strengths: ['Tomada de decisão rápida', 'Iniciativa diante de desafios', 'Foco em metas'],
    tips: ['Reserve tempo para ouvir a equipe antes de decidir', 'Valorize o ritmo e o cuidado dos colegas'],
    communication: 'Direta e objetiva; prefere ir ao ponto.',
    attention: ['Pode parecer impaciente', 'Pode negligenciar detalhes e opiniões divergentes'],
    idealEnvironment: 'Autonomia, metas claras, desafios e espaço para decidir.',
    motivators: ['Resultados', 'Autonomia', 'Desafios'],
    interviewQuestions: [
      'Conte uma situação em que você precisou decidir sem todas as informações.',
      'Como você lida quando a equipe discorda da sua direção?',
    ],
  },
  I: {
    name: 'Influência',
    headline: 'Comunicação e relacionamento',
    description: 'Você tende a se conectar com pessoas, comunicar com entusiasmo e motivar o ambiente.',
    strengths: ['Comunicação e persuasão', 'Criação de relacionamentos', 'Energia e otimismo'],
    tips: ['Registre combinados por escrito', 'Equilibre conversa com acompanhamento de detalhes'],
    communication: 'Expressiva e calorosa; gosta de interação.',
    attention: ['Pode se dispersar', 'Pode ter dificuldade com rotinas e prazos detalhados'],
    idealEnvironment: 'Interação, reconhecimento, variedade e trabalho em equipe.',
    motivators: ['Reconhecimento', 'Relacionamentos', 'Variedade'],
    interviewQuestions: [
      'Dê um exemplo de como você engajou um grupo resistente.',
      'Como você garante que compromissos assumidos em conversa sejam cumpridos?',
    ],
  },
  S: {
    name: 'Estabilidade',
    headline: 'Cooperação e constância',
    description: 'Você tende a ser paciente, confiável e a valorizar harmonia e consistência.',
    strengths: ['Paciência e escuta', 'Lealdade e constância', 'Colaboração'],
    tips: ['Comunique cedo o que te incomoda', 'Exercite a adaptação a mudanças rápidas'],
    communication: 'Calma e acolhedora; prefere ouvir antes de falar.',
    attention: ['Pode resistir a mudanças bruscas', 'Pode evitar conflitos necessários'],
    idealEnvironment: 'Rotina previsível, equipe estável e apoio mútuo.',
    motivators: ['Segurança', 'Harmonia', 'Reconhecimento da dedicação'],
    interviewQuestions: [
      'Como você reagiu à última mudança grande no seu trabalho?',
      'Conte uma situação em que precisou se posicionar contra o grupo.',
    ],
  },
  C: {
    name: 'Conformidade',
    headline: 'Precisão e qualidade',
    description: 'Você tende a valorizar análise, regras claras e qualidade no que entrega.',
    strengths: ['Atenção a detalhes', 'Análise crítica', 'Organização e qualidade'],
    tips: ['Defina um ponto de corte para análise', 'Compartilhe seu raciocínio com a equipe'],
    communication: 'Precisa e baseada em fatos; prefere informação por escrito.',
    attention: ['Pode ser perfeccionista', 'Pode demorar a decidir sem dados completos'],
    idealEnvironment: 'Padrões claros, tempo para analisar e foco em qualidade.',
    motivators: ['Qualidade', 'Precisão', 'Previsibilidade'],
    interviewQuestions: [
      'Conte um caso em que prazo e perfeição entraram em conflito.',
      'Como você decide quando já há informação suficiente?',
    ],
  },
};

/** Leitura de um fator isolado, na voz do candidato. */
export interface FactorBlock {
  factor: Factor;
  name: string;
  headline: string;
  description: string;
  strengths: string[];
  tips: string[];
}

/** Detalhes só para o recrutador (nunca vão para o candidato). */
export interface RecruiterDetails {
  communication: string;
  attention: string[];
  idealEnvironment: string;
  motivators: string[];
  interviewQuestions: string[];
}

export interface CandidateSummary {
  primary: Factor;
  secondary: Factor;
  /** Combinação ordenada, ex.: 'DI'. */
  code: ProfileCode;
  /** Empate técnico entre o 1º e o 2º fator. */
  tied: boolean;
  title: string;
  /** Leitura dos dois fatores juntos. */
  description: string;
  /** O resultado dos dois juntos (perfil combinado). */
  combined: { name: string; headline: string; description: string; strengths: string[]; tips: string[] };
  primaryProfile: FactorBlock;
  secondaryProfile: FactorBlock;
  /** Presente só quando há empate. */
  tieNote?: string;
  disclaimer: string;
}

export interface RecruiterSummary extends CandidateSummary, RecruiterDetails {
  /** Diferença em pontos percentuais entre o 1º e o 2º fator. */
  gap: number;
  /** Leituras de recrutador de cada fator isolado (o topo desta interface traz as da combinação). */
  primaryDetails: RecruiterDetails;
  secondaryDetails: RecruiterDetails;
}

const DISCLAIMER =
  'O DISC descreve preferências de comportamento. Não é um diagnóstico nem um critério único de seleção.';

const block = (factor: Factor): FactorBlock => {
  const c = FACTOR_CONTENT[factor];
  return {
    factor,
    name: c.name,
    headline: c.headline,
    description: c.description,
    strengths: c.strengths,
    tips: c.tips,
  };
};

const details = (c: {
  communication: string;
  attention: string[];
  idealEnvironment: string;
  motivators: string[];
  interviewQuestions: string[];
}): RecruiterDetails => ({
  communication: c.communication,
  attention: c.attention,
  idealEnvironment: c.idealEnvironment,
  motivators: c.motivators,
  interviewQuestions: c.interviewQuestions,
});

/** Visão do candidato: sem comparações com outros, sem ranking, sem recomendação de contratação. */
export function candidateSummary(profile: Profile): CandidateSummary {
  const p = FACTOR_CONTENT[profile.primary];
  const s = FACTOR_CONTENT[profile.secondary];
  const c = COMBINED_CONTENT[profile.code];
  const name = `${p.name} com ${s.name}`;
  return {
    primary: profile.primary,
    secondary: profile.secondary,
    code: profile.code,
    tied: profile.tied,
    title: `Perfil ${profile.code} · ${name}`,
    description: c.description,
    combined: { name, headline: c.headline, description: c.description, strengths: c.strengths, tips: c.tips },
    primaryProfile: block(profile.primary),
    secondaryProfile: block(profile.secondary),
    ...(profile.tied
      ? {
          tieNote:
            `${p.name} (${profile.primary}) e ${s.name} (${profile.secondary}) pontuaram praticamente igual no seu resultado. ` +
            'A ordem entre eles é só uma convenção: leia os dois perfis com o mesmo peso.',
        }
      : {}),
    disclaimer: DISCLAIMER,
  };
}

export function recruiterSummary(profile: Profile): RecruiterSummary {
  return {
    ...candidateSummary(profile),
    ...details(COMBINED_CONTENT[profile.code]),
    gap: profile.gap,
    primaryDetails: details(FACTOR_CONTENT[profile.primary]),
    secondaryDetails: details(FACTOR_CONTENT[profile.secondary]),
  };
}
