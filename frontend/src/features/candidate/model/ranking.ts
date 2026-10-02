export type Ranks = Record<string, number | undefined>; // optionId -> 1..4

export const RANK_VALUES = [1, 2, 3, 4] as const;

/** Valores já usados por outras opções do mesmo grupo (não podem ser repetidos). */
export function usedRanks(optionIds: string[], ranks: Ranks, exceptOptionId?: string): Set<number> {
  const used = new Set<number>();
  for (const id of optionIds) {
    const r = ranks[id];
    if (id !== exceptOptionId && r !== undefined) used.add(r);
  }
  return used;
}

export function isRankDisabled(optionIds: string[], ranks: Ranks, optionId: string, rank: number): boolean {
  return usedRanks(optionIds, ranks, optionId).has(rank);
}

/** Atribui (ou remove, se tocar no mesmo valor) um rank. Ignora valores já usados no grupo. */
export function setRank(optionIds: string[], ranks: Ranks, optionId: string, rank: number): Ranks {
  if (ranks[optionId] === rank) return { ...ranks, [optionId]: undefined };
  if (isRankDisabled(optionIds, ranks, optionId, rank)) return ranks;
  return { ...ranks, [optionId]: rank };
}

export function isGroupComplete(optionIds: string[], ranks: Ranks): boolean {
  const used = usedRanks(optionIds, ranks);
  return optionIds.every((id) => ranks[id] !== undefined) && used.size === optionIds.length;
}

export function answeredCount(groups: Array<{ options: Array<{ id: string }> }>, ranks: Ranks): number {
  return groups.filter((g) =>
    isGroupComplete(
      g.options.map((o) => o.id),
      ranks,
    ),
  ).length;
}

export function toAnswers(ranks: Ranks): Array<{ optionId: string; rank: number }> {
  return Object.entries(ranks)
    .filter((e): e is [string, number] => e[1] !== undefined)
    .map(([optionId, rank]) => ({ optionId, rank }));
}
