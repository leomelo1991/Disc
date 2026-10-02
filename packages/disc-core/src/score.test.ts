import { describe, expect, it } from 'vitest';
import { calculateProfile, InvalidAnswersError } from './score.js';
import type { Answer, Factor, QuestionGroup } from './types.js';

const order: Factor[] = ['D', 'I', 'S', 'C'];
const groups = (n: number): QuestionGroup[] =>
  Array.from({ length: n }, (_, g) => ({
    id: `g${g}`,
    options: order.map((f) => ({ id: `g${g}-${f}`, factor: f })),
  }));

const answersWith = (gs: QuestionGroup[], ranks: Record<Factor, number>): Answer[] =>
  gs.flatMap((g) => g.options.map((o) => ({ optionId: o.id, rank: ranks[o.factor] })));

describe('calculateProfile', () => {
  const gs = groups(24);

  it('soma ranks por fator e define primário/secundário', () => {
    const p = calculateProfile(gs, answersWith(gs, { D: 4, I: 3, S: 2, C: 1 }));
    expect(p.scores).toEqual({ D: 96, I: 72, S: 48, C: 24 });
    expect(p.primary).toBe('D');
    expect(p.secondary).toBe('I');
    expect(p.percentages.D).toBe(100);
    expect(p.percentages.C).toBe(0);
    expect(p.code).toBe('DI');
    expect(p.gap).toBe(33.3);
    expect(p.tied).toBe(false);
  });

  it('soma total é constante (24 × 10 = 240)', () => {
    const p = calculateProfile(gs, answersWith(gs, { D: 1, I: 4, S: 3, C: 2 }));
    expect(Object.values(p.scores).reduce((a, b) => a + b, 0)).toBe(240);
    expect(p.primary).toBe('I');
  });

  it('marca empate técnico quando a diferença é < 5 pontos percentuais', () => {
    const answers = answersWith(gs, { D: 4, I: 3, S: 2, C: 1 });
    // inverte D/I em um grupo: D 95, I 73 não empata; força empate trocando 2 grupos em direções opostas
    const swap = (g: string, a: Factor, b: Factor) => {
      const ia = answers.find((x) => x.optionId === `${g}-${a}`)!;
      const ib = answers.find((x) => x.optionId === `${g}-${b}`)!;
      [ia.rank, ib.rank] = [ib.rank, ia.rank];
    };
    for (let i = 0; i < 11; i++) swap(`g${i}`, 'D', 'I');
    const p = calculateProfile(gs, answers);
    expect(p.scores.D).toBe(85);
    expect(p.scores.I).toBe(83);
    expect(p.gap).toBe(2.8);
    expect(p.tied).toBe(true);
  });

  it('rejeita rank repetido no grupo', () => {
    const answers = answersWith(gs, { D: 4, I: 3, S: 2, C: 1 });
    answers.find((a) => a.optionId === 'g0-I')!.rank = 4;
    expect(() => calculateProfile(gs, answers)).toThrow(InvalidAnswersError);
  });

  it('rejeita grupo faltando e rank fora de 1..4', () => {
    const answers = answersWith(gs, { D: 4, I: 3, S: 2, C: 1 }).slice(4);
    expect(() => calculateProfile(gs, answers)).toThrow(InvalidAnswersError);
    const bad = answersWith(gs, { D: 5, I: 3, S: 2, C: 1 });
    expect(() => calculateProfile(gs, bad)).toThrow(InvalidAnswersError);
  });
});

import { candidateSummary, recruiterSummary } from './content.js';

describe('summaries', () => {
  const gs = groups(24);
  const profile = calculateProfile(gs, answersWith(gs, { D: 4, I: 3, S: 2, C: 1 }));

  it('candidato não recebe dados de recrutador', () => {
    const c = candidateSummary(profile) as unknown as Record<string, unknown>;
    expect(c.interviewQuestions).toBeUndefined();
    expect(c.attention).toBeUndefined();
    expect(c.disclaimer).toBeTruthy();
  });

  it('recrutador recebe perguntas de entrevista', () => {
    expect(recruiterSummary(profile).interviewQuestions.length).toBeGreaterThan(0);
  });
});
