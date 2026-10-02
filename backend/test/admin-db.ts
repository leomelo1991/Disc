import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/infra/prisma/generated/client.js';

let client: PrismaClient | undefined;

/** Cliente do DONO do schema (ignora RLS). Só para montar fixtures e conferir resultados nos testes. */
export function adminPrisma(): PrismaClient {
  client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  return client;
}
