import type { Ranks } from './ranking';

export interface Draft {
  candidate: Record<string, string>;
  consent: boolean;
  ranks: Ranks;
  step: 'welcome' | 'identify' | 'questions' | 'review';
  groupIndex: number;
  idempotencyKey: string;
}

const key = (token: string) => `disc:draft:${token}`;

/** localStorage pode falhar (modo privado, bloqueio); o fluxo funciona sem ele. */
export function loadDraft(token: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(token));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(token: string, draft: Draft) {
  try {
    localStorage.setItem(key(token), JSON.stringify(draft));
  } catch {
    /* ignora */
  }
}

export function clearDraft(token: string) {
  try {
    localStorage.removeItem(key(token));
  } catch {
    /* ignora */
  }
}

export function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const resultKey = (token: string) => `disc:result:${token}`;

export function saveResult(token: string, summary: unknown) {
  try {
    localStorage.setItem(resultKey(token), JSON.stringify(summary));
  } catch {
    /* ignora */
  }
}

export function loadResult<T>(token: string): T | null {
  try {
    const raw = localStorage.getItem(resultKey(token));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
