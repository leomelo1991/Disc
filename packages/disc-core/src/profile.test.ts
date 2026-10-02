import { describe, expect, it } from 'vitest';
import { buildProfile, TIE_THRESHOLD_PCT } from './score.js';
import { PROFILE_CODES, type Factor, type ProfileCode, type Scores } from './types.js';

const N = 24; // grupos; cada fator varia de 24 a 96 (amplitude 72)

/** Monta pontuações com o 1º e o 2º fator indicados e os outros dois claramente abaixo. */
function scoresFor(first: Factor, second: Factor, secondGapRaw: number): Scores {
  const rest = (['D', 'I', 'S', 'C'] as Factor[]).filter((f) => f !== first && f !== second);
  const s = { D: 0, I: 0, S: 0, C: 0 } as Scores;
  s[first] = 80;
  s[second] = 80 - secondGapRaw;
  s[rest[0]!] = 50;
  s[rest[1]!] = 30;
  return s;
}

describe('perfis combinados', () => {
  it('existem exatamente 12 variantes ordenadas, todas distintas', () => {
    expect(PROFILE_CODES).toHaveLength(12);
    expect(new Set(PROFILE_CODES).size).toBe(12);
    // nenhuma combinação de um fator com ele mesmo
    expect(PROFILE_CODES.every((c) => c[0] !== c[1])).toBe(true);
  });

  it('cada par (principal, secundário) gera o código correspondente, e a ordem importa', () => {
    const factors: Factor[] = ['D', 'I', 'S', 'C'];
    const seen = new Set<ProfileCode>();
    for (const a of factors) {
      for (const b of factors) {
        if (a === b) continue;
        const p = buildProfile(scoresFor(a, b, 10), N);
        expect(p.primary).toBe(a);
        expect(p.secondary).toBe(b);
        expect(p.code).toBe(`${a}${b}`);
        seen.add(p.code);
      }
    }
    expect(seen.size).toBe(12);
  });
});

describe('empate técnico', () => {
  it(`o limite é ${TIE_THRESHOLD_PCT} pontos percentuais`, () => {
    expect(TIE_THRESHOLD_PCT).toBe(5);
  });

  it('3 pontos brutos de diferença (4,2 pp) é empate; 4 pontos (5,6 pp) não é', () => {
    const three = buildProfile(scoresFor('D', 'I', 3), N);
    expect(three.gap).toBe(4.2);
    expect(three.tied).toBe(true);

    const four = buildProfile(scoresFor('D', 'I', 4), N);
    expect(four.gap).toBe(5.6);
    expect(four.tied).toBe(false);
  });

  it('pontuação idêntica é empate total e a ordem segue D > I > S > C', () => {
    const p = buildProfile({ D: 60, I: 60, S: 40, C: 20 }, N);
    expect(p.gap).toBe(0);
    expect(p.tied).toBe(true);
    expect(p.code).toBe('DI');

    const q = buildProfile({ D: 20, I: 40, S: 60, C: 60 }, N);
    expect(q.tied).toBe(true);
    expect(q.code).toBe('SC');
  });

  it('o 3º e o 4º fatores não influenciam o empate', () => {
    const p = buildProfile({ D: 70, I: 40, S: 39, C: 38 }, N);
    expect(p.tied).toBe(false);
  });
});
