import { describe, expect, it } from 'vitest';
import { COMBINED_CONTENT, candidateSummary, FACTOR_CONTENT, recruiterSummary } from './content.js';
import { buildProfile } from './score.js';
import { PROFILE_CODES, type Factor, type Scores } from './types.js';

const profileFor = (first: Factor, second: Factor, gapRaw = 12) => {
  const rest = (['D', 'I', 'S', 'C'] as Factor[]).filter((f) => f !== first && f !== second);
  const s = { D: 0, I: 0, S: 0, C: 0 } as Scores;
  s[first] = 80;
  s[second] = 80 - gapRaw;
  s[rest[0]!] = 50;
  s[rest[1]!] = 30;
  return buildProfile(s, 24);
};

describe('conteúdo das 12 combinações', () => {
  it('todas têm todos os campos preenchidos', () => {
    for (const code of PROFILE_CODES) {
      const c = COMBINED_CONTENT[code];
      expect(c.headline.length, code).toBeGreaterThan(3);
      expect(c.description.length, code).toBeGreaterThan(40);
      expect(c.communication.length, code).toBeGreaterThan(5);
      expect(c.idealEnvironment.length, code).toBeGreaterThan(5);
      for (const list of [c.strengths, c.tips, c.attention, c.motivators, c.interviewQuestions]) {
        expect(list.length, code).toBeGreaterThanOrEqual(2);
        expect(
          list.every((x) => x.trim().length > 3),
          code,
        ).toBe(true);
      }
    }
  });

  it('DI e ID têm leituras diferentes (a ordem importa), e nenhum texto se repete entre combinações', () => {
    expect(COMBINED_CONTENT.DI.description).not.toBe(COMBINED_CONTENT.ID.description);
    expect(COMBINED_CONTENT.DI.headline).not.toBe(COMBINED_CONTENT.ID.headline);
    const headlines = PROFILE_CODES.map((c) => COMBINED_CONTENT[c].headline);
    const descriptions = PROFILE_CODES.map((c) => COMBINED_CONTENT[c].description);
    expect(new Set(headlines).size).toBe(12);
    expect(new Set(descriptions).size).toBe(12);
  });
});

describe('resumo do candidato', () => {
  it('sempre traz o perfil combinado, o principal e o secundário', () => {
    const s = candidateSummary(profileFor('D', 'I'));
    expect(s.code).toBe('DI');
    expect(s.title).toBe('Perfil DI · Dominância com Influência');
    expect(s.combined.name).toBe('Dominância com Influência');
    expect(s.combined.strengths.length).toBeGreaterThan(0);
    expect(s.primaryProfile.factor).toBe('D');
    expect(s.primaryProfile.name).toBe(FACTOR_CONTENT.D.name);
    expect(s.secondaryProfile.factor).toBe('I');
    expect(s.secondaryProfile.name).toBe(FACTOR_CONTENT.I.name);
  });

  it('sem empate não há nota de empate', () => {
    const s = candidateSummary(profileFor('S', 'C', 12));
    expect(s.tied).toBe(false);
    expect(s.tieNote).toBeUndefined();
  });

  it('com empate traz a nota, citando os dois perfis, sem números internos', () => {
    const s = candidateSummary(profileFor('I', 'S', 2));
    expect(s.tied).toBe(true);
    expect(s.tieNote).toContain('Influência (I)');
    expect(s.tieNote).toContain('Estabilidade (S)');
    expect(s.tieNote).toContain('mesmo peso');
    expect(s.tieNote).not.toMatch(/\d+(,\d+)?\s*(pp|pontos)/);
  });

  it('não vaza nada de recrutador (nem na combinação, nem nos blocos por fator)', () => {
    const json = JSON.stringify(candidateSummary(profileFor('D', 'C', 2)));
    for (const key of ['interviewQuestions', 'attention', 'communication', 'idealEnvironment', 'motivators', 'gap']) {
      expect(json, key).not.toContain(`"${key}"`);
    }
  });
});

describe('resumo do recrutador', () => {
  it('traz a leitura combinada e a de cada fator, mais a diferença', () => {
    const s = recruiterSummary(profileFor('C', 'D', 2));
    expect(s.code).toBe('CD');
    expect(s.gap).toBe(2.8);
    expect(s.interviewQuestions).toEqual(COMBINED_CONTENT.CD.interviewQuestions);
    expect(s.attention).toEqual(COMBINED_CONTENT.CD.attention);
    expect(s.primaryDetails.attention).toEqual(FACTOR_CONTENT.C.attention);
    expect(s.secondaryDetails.interviewQuestions).toEqual(FACTOR_CONTENT.D.interviewQuestions);
    expect(s.tieNote).toBeTruthy();
  });
});
