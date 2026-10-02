import { execSync } from 'node:child_process';

/** Garante os dados fictícios da demonstração no banco de teste (idempotente). */
export default function globalSetup() {
  execSync('pnpm --filter @disc/backend db:seed:demo', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test',
    },
  });
}
