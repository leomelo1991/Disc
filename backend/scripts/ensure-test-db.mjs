// Garante que o banco de testes existe, está migrado e populado. Idempotente e rápido quando já está tudo certo.
// Usado pelo vitest (globalSetup) e pelo Playwright: assim `docker compose down -v` não quebra os testes com
// erros confusos ("database does not exist"); o banco é recriado sozinho.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.TEST_DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc_test';
const db = decodeURIComponent(new URL(url).pathname.slice(1));
const adminUrl = new URL(url);
adminUrl.pathname = '/postgres';

function run(args) {
  const r = spawnSync('pnpm', ['exec', ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`${args.join(' ')} falhou:\n${r.stdout}\n${r.stderr}`);
}

async function withClient(connectionString, fn) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function ensureTestDb() {
  let created = false;
  await withClient(adminUrl.toString(), async (c) => {
    const { rowCount } = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
    if (!rowCount) {
      await c.query(`CREATE DATABASE "${db.replace(/"/g, '""')}"`);
      created = true;
    }
  });

  run(['prisma', 'migrate', 'deploy']); // aplica o que faltar (também mantém o banco em dia após um git pull)

  // O papel da aplicação nasce sem login na migration; em dev/CI damos senha a ele (só se ainda não puder logar).
  await withClient(adminUrl.toString(), async (c) => {
    const { rows } = await c.query("SELECT rolcanlogin FROM pg_roles WHERE rolname = 'disc_app'");
    if (rows[0] && !rows[0].rolcanlogin) await c.query("ALTER ROLE disc_app LOGIN PASSWORD 'disc_app'");
  });

  const seeded = await withClient(url, async (c) => {
    const { rows } = await c.query('SELECT count(*)::int AS n FROM questionnaire');
    return rows[0].n > 0;
  });
  if (!seeded) run(['prisma', 'db', 'seed']);

  return { created, seeded: !seeded };
}

// Execução direta: `node scripts/ensure-test-db.mjs`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureTestDb()
    .then((r) => console.log(r.created ? 'Banco de testes criado e populado.' : 'Banco de testes pronto.'))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
