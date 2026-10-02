import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Factor } from '../src/infra/prisma/generated/client.js';
import { DISC_V1_GROUPS } from './disc-v1.js';

const FACTORS: Factor[] = ['D', 'I', 'S', 'C'];

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc' }),
  });
  const type = await prisma.assessmentType.upsert({
    where: { code: 'DISC' },
    update: {},
    create: { code: 'DISC', name: 'DISC' },
  });
  const existing = await prisma.questionnaire.findUnique({
    where: { assessmentTypeId_version: { assessmentTypeId: type.id, version: 1 } },
  });
  if (existing) {
    console.log('DISC v1 já existe, nada a fazer.');
    return;
  }
  await prisma.questionnaire.create({
    data: {
      assessmentTypeId: type.id,
      version: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      groups: {
        create: DISC_V1_GROUPS.map((labels, g) => ({
          position: g + 1,
          options: { create: labels.map((label, i) => ({ label, factor: FACTORS[i]!, position: i + 1 })) },
        })),
      },
    },
  });
  console.log(`DISC v1 criado com ${DISC_V1_GROUPS.length} grupos.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
