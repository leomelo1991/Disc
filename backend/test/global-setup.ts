// @ts-expect-error módulo .mjs sem tipos (script compartilhado com o Playwright)
import { ensureTestDb } from '../scripts/ensure-test-db.mjs';

/** Antes de qualquer teste: garante banco, migrations e questionário (recria sozinho se o volume do Docker foi apagado). */
export default async function setup() {
  await ensureTestDb();
}
