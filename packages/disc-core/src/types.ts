export const FACTORS = ['D', 'I', 'S', 'C'] as const;
export type Factor = (typeof FACTORS)[number];

export interface QuestionOption {
  id: string;
  factor: Factor;
}

export interface QuestionGroup {
  id: string;
  options: QuestionOption[];
}

export interface Answer {
  optionId: string;
  rank: number;
}

/** As 12 combinações ordenadas (principal + secundário). DI e ID são leituras diferentes. */
export const PROFILE_CODES = ['DI', 'DS', 'DC', 'ID', 'IS', 'IC', 'SD', 'SI', 'SC', 'CD', 'CI', 'CS'] as const;
export type ProfileCode = (typeof PROFILE_CODES)[number];

export type Scores = Record<Factor, number>;
export type Intensity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Profile {
  scores: Scores;
  percentages: Scores;
  intensities: Record<Factor, Intensity>;
  primary: Factor;
  secondary: Factor;
  /** Combinação ordenada principal + secundário, ex.: 'DI'. */
  code: ProfileCode;
  /** Diferença, em pontos percentuais, entre o 1º e o 2º fator. */
  gap: number;
  /** Empate técnico: gap < TIE_THRESHOLD_PCT. Nesse caso a ordem entre os dois é só convenção. */
  tied: boolean;
}
