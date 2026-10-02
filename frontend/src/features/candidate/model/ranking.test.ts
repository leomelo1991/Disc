import { describe, expect, it } from 'vitest';
import { answeredCount, isGroupComplete, isRankDisabled, setRank, toAnswers } from './ranking';

const ids = ['a', 'b', 'c', 'd'];

describe('ranking 1..4 sem repetição', () => {
  it('não permite repetir um valor dentro do grupo', () => {
    let r = setRank(ids, {}, 'a', 4);
    expect(isRankDisabled(ids, r, 'b', 4)).toBe(true);
    expect(isRankDisabled(ids, r, 'a', 4)).toBe(false);
    r = setRank(ids, r, 'b', 4);
    expect(r.b).toBeUndefined();
  });

  it('tocar no mesmo valor remove a escolha', () => {
    const r = setRank(ids, setRank(ids, {}, 'a', 2), 'a', 2);
    expect(r.a).toBeUndefined();
  });

  it('trocar o valor de uma opção libera o anterior', () => {
    let r = setRank(ids, {}, 'a', 1);
    r = setRank(ids, r, 'a', 3);
    expect(isRankDisabled(ids, r, 'b', 1)).toBe(false);
    expect(isRankDisabled(ids, r, 'b', 3)).toBe(true);
  });

  it('grupo só completa com os 4 valores distintos', () => {
    let r = {};
    ids.forEach((id, i) => (r = setRank(ids, r, id, i + 1)));
    expect(isGroupComplete(ids, r)).toBe(true);
    expect(isGroupComplete(ids, setRank(ids, r, 'a', 1))).toBe(false);
    expect(answeredCount([{ options: ids.map((id) => ({ id })) }], r)).toBe(1);
  });

  it('toAnswers ignora opções sem valor', () => {
    expect(toAnswers({ a: 1, b: undefined })).toEqual([{ optionId: 'a', rank: 1 }]);
  });
});
