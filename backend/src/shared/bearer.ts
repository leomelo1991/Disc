import { timingSafeEqual } from 'node:crypto';

/** Confere `Authorization: Bearer <segredo>` em tempo constante (sem vazar o tamanho nem o prefixo certo por timing). */
export function bearerMatches(header: string | undefined, secret: string): boolean {
  const a = Buffer.from(header ?? '');
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
