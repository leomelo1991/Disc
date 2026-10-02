import { execSync } from 'node:child_process';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test';

/** Garante o banco de testes (recria se o volume do Docker foi apagado) e os dados fictícios da demonstração. */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: TEST_DB, TEST_DATABASE_URL: TEST_DB };
  execSync('pnpm --filter @disc/backend exec node scripts/ensure-test-db.mjs', { stdio: 'inherit', env });
  execSync('pnpm --filter @disc/backend db:seed:demo', { stdio: 'inherit', env });
}
