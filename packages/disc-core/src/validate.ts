import type { Answer, QuestionGroup } from './types.js';

export type ValidationIssue =
  | { code: 'UNKNOWN_OPTION'; optionId: string }
  | { code: 'DUPLICATE_OPTION'; optionId: string }
  | { code: 'MISSING_ANSWER'; groupId: string }
  | { code: 'INVALID_RANK'; groupId: string; optionId: string }
  | { code: 'REPEATED_RANK'; groupId: string };

/** Valida respostas: um rank 1..4 por opção, sem repetir valor dentro do grupo. */
export function validateAnswers(groups: QuestionGroup[], answers: Answer[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const optionToGroup = new Map<string, string>();
  for (const g of groups) for (const o of g.options) optionToGroup.set(o.id, g.id);

  const byOption = new Map<string, number>();
  for (const a of answers) {
    if (!optionToGroup.has(a.optionId)) {
      issues.push({ code: 'UNKNOWN_OPTION', optionId: a.optionId });
      continue;
    }
    if (byOption.has(a.optionId)) {
      issues.push({ code: 'DUPLICATE_OPTION', optionId: a.optionId });
      continue;
    }
    byOption.set(a.optionId, a.rank);
  }

  for (const g of groups) {
    const ranks: number[] = [];
    let missing = false;
    for (const o of g.options) {
      const rank = byOption.get(o.id);
      if (rank === undefined) {
        missing = true;
      } else if (!Number.isInteger(rank) || rank < 1 || rank > g.options.length) {
        issues.push({ code: 'INVALID_RANK', groupId: g.id, optionId: o.id });
      } else {
        ranks.push(rank);
      }
    }
    if (missing) issues.push({ code: 'MISSING_ANSWER', groupId: g.id });
    if (new Set(ranks).size !== ranks.length) issues.push({ code: 'REPEATED_RANK', groupId: g.id });
  }
  return issues;
}
