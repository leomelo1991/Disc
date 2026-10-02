import {
  FACTORS,
  type Answer,
  type Factor,
  type Intensity,
  type Profile,
  type ProfileCode,
  type QuestionGroup,
  type Scores,
} from './types.js';
import { validateAnswers, type ValidationIssue } from './validate.js';

/** Empate técnico: o 2º fator está a menos de 5 pontos percentuais do 1º (até 3 pontos brutos com 24 grupos). */
export const TIE_THRESHOLD_PCT = 5;
const PRECEDENCE: Factor[] = ['D', 'I', 'S', 'C'];

export class InvalidAnswersError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(`Respostas inválidas: ${issues.length} problema(s)`);
  }
}

function intensity(pct: number): Intensity {
  if (pct >= 65) return 'HIGH';
  if (pct >= 35) return 'MEDIUM';
  return 'LOW';
}

export function calculateProfile(groups: QuestionGroup[], answers: Answer[]): Profile {
  const issues = validateAnswers(groups, answers);
  if (issues.length > 0) throw new InvalidAnswersError(issues);

  const rankByOption = new Map(answers.map((a) => [a.optionId, a.rank]));
  const scores: Scores = { D: 0, I: 0, S: 0, C: 0 };
  for (const g of groups) for (const o of g.options) scores[o.factor] += rankByOption.get(o.id)!;

  return buildProfile(scores, groups.length);
}

/** Monta o perfil a partir de pontuações já somadas (usado também ao reler do banco). */
export function buildProfile(scores: Scores, groupCount: number): Profile {
  const min = groupCount;
  const max = 4 * groupCount;
  const percentages = { D: 0, I: 0, S: 0, C: 0 } as Scores;
  const intensities = {} as Record<Factor, Intensity>;
  for (const f of FACTORS) {
    percentages[f] = Math.round(((scores[f] - min) / (max - min)) * 1000) / 10;
    intensities[f] = intensity(percentages[f]);
  }

  const sorted = [...FACTORS].sort((a, b) => scores[b] - scores[a] || PRECEDENCE.indexOf(a) - PRECEDENCE.indexOf(b));
  const primary = sorted[0]!;
  const secondary = sorted[1]!;
  // Calculado sobre as pontuações brutas (sem o arredondamento de exibição dos percentuais).
  const rawGap = ((scores[primary] - scores[secondary]) / (max - min)) * 100;
  const gap = Math.round(rawGap * 10) / 10;
  const tied = rawGap < TIE_THRESHOLD_PCT;
  const code = `${primary}${secondary}` as ProfileCode;

  return { scores, percentages, intensities, primary, secondary, code, gap, tied };
}
