/**
 * Dados FICTÍCIOS para demonstração comercial (empresa, pessoas e respostas inventadas; e-mails @example.com).
 * Os perfis são calculados pelo mesmo @disc/core usado em produção, a partir de respostas geradas de forma
 * determinística (mesma saída a cada execução).
 *
 * Uso: pnpm --filter @disc/backend db:seed:demo [--reset]
 * Credenciais da demo (apenas para ambiente de demonstração): demo@aurora.example / demo-disc-2026
 */
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash } from 'node:crypto';
import { calculateProfile, type Factor } from '@disc/core';
import { PrismaClient } from '../src/infra/prisma/generated/client.js';

export const DEMO = {
  slug: 'demo-aurora',
  company: 'Aurora Talentos (demonstração)',
  adminEmail: 'demo@aurora.example',
  recruiterEmail: 'recrutadora@aurora.example',
  password: 'demo-disc-2026',
} as const;

type Bias = Record<Factor, number>;
interface Person {
  name: string;
  jobTitle: string;
  department: string;
  birthDate: string;
  daysAgo: number;
  bias: Bias;
  /** Garante um resultado com empate técnico entre os dois primeiros fatores (para a demonstração). */
  tie?: true;
}

const D: Bias = { D: 1.2, I: 0.4, S: -0.2, C: 0.2 };
const I: Bias = { D: 0.3, I: 1.2, S: 0.4, C: -0.4 };
const S: Bias = { D: -0.3, I: 0.3, S: 1.2, C: 0.5 };
const C: Bias = { D: 0.1, I: -0.4, S: 0.5, C: 1.2 };
const DI: Bias = { D: 1.0, I: 0.9, S: -0.3, C: -0.1 };
const SC: Bias = { D: -0.4, I: 0.0, S: 1.0, C: 1.0 };

export const PEOPLE: Person[] = [
  {
    name: 'Helena Prado',
    jobTitle: 'Gerente Comercial',
    department: 'Vendas',
    birthDate: '1988-03-12',
    daysAgo: 2,
    bias: D,
  },
  {
    name: 'Rafael Moura',
    jobTitle: 'Executivo de Contas',
    department: 'Vendas',
    birthDate: '1993-07-30',
    daysAgo: 4,
    bias: DI,
    tie: true,
  },
  {
    name: 'Camila Duarte',
    jobTitle: 'Analista de Marketing',
    department: 'Marketing',
    birthDate: '1995-11-05',
    daysAgo: 6,
    bias: I,
  },
  {
    name: 'Bruno Tavares',
    jobTitle: 'Analista Financeiro',
    department: 'Financeiro',
    birthDate: '1990-01-22',
    daysAgo: 9,
    bias: C,
  },
  {
    name: 'Larissa Nogueira',
    jobTitle: 'Assistente de RH',
    department: 'Recursos Humanos',
    birthDate: '1997-05-17',
    daysAgo: 11,
    bias: S,
  },
  {
    name: 'Otávio Salles',
    jobTitle: 'Desenvolvedor Backend',
    department: 'Tecnologia',
    birthDate: '1991-09-08',
    daysAgo: 14,
    bias: C,
  },
  {
    name: 'Marina Queiroz',
    jobTitle: 'Coordenadora de Atendimento',
    department: 'Operações',
    birthDate: '1989-12-02',
    daysAgo: 16,
    bias: S,
  },
  {
    name: 'Diego Albuquerque',
    jobTitle: 'Diretor de Operações',
    department: 'Operações',
    birthDate: '1984-04-14',
    daysAgo: 19,
    bias: D,
  },
  {
    name: 'Patrícia Lemos',
    jobTitle: 'Designer de Produto',
    department: 'Tecnologia',
    birthDate: '1994-08-27',
    daysAgo: 22,
    bias: I,
  },
  {
    name: 'Eduardo Faria',
    jobTitle: 'Analista de Qualidade',
    department: 'Operações',
    birthDate: '1992-02-19',
    daysAgo: 25,
    bias: SC,
  },
  {
    name: 'Sofia Brandão',
    jobTitle: 'Executiva de Contas',
    department: 'Vendas',
    birthDate: '1996-06-03',
    daysAgo: 29,
    bias: DI,
  },
  {
    name: 'Gustavo Ribeiro',
    jobTitle: 'Contador',
    department: 'Financeiro',
    birthDate: '1987-10-11',
    daysAgo: 33,
    bias: C,
  },
  {
    name: 'Aline Cardoso',
    jobTitle: 'Analista de Suporte',
    department: 'Atendimento',
    birthDate: '1998-03-25',
    daysAgo: 38,
    bias: S,
  },
  {
    name: 'Felipe Barros',
    jobTitle: 'Gerente de Projetos',
    department: 'Tecnologia',
    birthDate: '1985-12-30',
    daysAgo: 43,
    bias: D,
  },
];

/** PRNG determinístico (mulberry32): mesmas respostas a cada execução. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

export async function seedDemo(prisma: PrismaClient, opts: { reset?: boolean; log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => undefined);
  const existing = await prisma.tenant.findUnique({ where: { slug: DEMO.slug } });
  if (existing && !opts.reset) {
    log('Demonstração já existe (use --reset para recriar).');
    return { created: false as const, tenantId: existing.id };
  }
  if (existing) {
    const t = existing.id;
    await prisma.submission.deleteMany({ where: { tenantId: t } });
    await prisma.invitation.deleteMany({ where: { tenantId: t } });
    await prisma.auditLog.deleteMany({ where: { tenantId: t } });
    await prisma.user.deleteMany({ where: { tenantId: t } });
    await prisma.tenant.delete({ where: { id: t } });
  }

  const questionnaire = await prisma.questionnaire.findFirstOrThrow({
    where: { assessmentType: { code: 'DISC' }, status: 'PUBLISHED' },
    orderBy: { version: 'desc' },
    include: { groups: { orderBy: { position: 'asc' }, include: { options: true } } },
  });

  const passwordHash = await hash(DEMO.password);
  const tenant = await prisma.tenant.create({ data: { name: DEMO.company, slug: DEMO.slug, retentionDays: 365 } });
  const admin = await prisma.user.create({
    data: { tenantId: tenant.id, name: 'Ana Demonstração', email: DEMO.adminEmail, passwordHash, role: 'ADMIN' },
  });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Rita Recrutadora',
      email: DEMO.recruiterEmail,
      passwordHash,
      role: 'RECRUITER',
    },
  });

  const now = Date.now();
  const DAY = 86_400_000;

  for (const [i, p] of PEOPLE.entries()) {
    // Para cada grupo, ordena as 4 opções por (viés do perfil + ruído): a mais "parecida" recebe 4.
    // Para quem deve ter empate, testa sementes determinísticas até o perfil empatar (mesma saída a cada execução).
    let attempt = 0;
    let rand = prng(1000 + i);
    let answers: Array<{ groupId: string; optionId: string; rank: number }>;
    let profile: ReturnType<typeof calculateProfile>;
    for (;;) {
      rand = prng(1000 + i + attempt * 7919);
      answers = questionnaire.groups.flatMap((g) => {
        const scored = g.options
          .map((o) => ({ o, s: p.bias[o.factor] + (rand() - 0.5) * 1.6 }))
          .sort((a, b) => a.s - b.s);
        return scored.map((x, idx) => ({ groupId: g.id, optionId: x.o.id, rank: idx + 1 }));
      });
      profile = calculateProfile(
        questionnaire.groups,
        answers.map((a) => ({ optionId: a.optionId, rank: a.rank })),
      );
      if (!p.tie || profile.tied) break;
      if (++attempt > 5000) throw new Error(`Não foi possível gerar um empate para ${p.name}`);
    }

    const submittedAt = new Date(now - p.daysAgo * DAY - Math.floor(rand() * 8) * 3_600_000);
    const invitation = await prisma.invitation.create({
      data: {
        tenantId: tenant.id,
        questionnaireId: questionnaire.id,
        createdById: admin.id,
        tokenHash: sha(`demo-invitation-${i}`), // token real descartado: convite já concluído
        status: 'COMPLETED',
        expiresAt: new Date(submittedAt.getTime() + 7 * DAY),
        targetRole: p.jobTitle,
        targetDepartment: p.department,
        createdAt: new Date(submittedAt.getTime() - 2 * DAY),
      },
    });
    const sub = await prisma.submission.create({
      data: {
        tenantId: tenant.id,
        invitationId: invitation.id,
        idempotencyKey: `demo-${i}`,
        consentAt: submittedAt,
        consentVersion: '2026-10',
        submittedAt,
      },
    });
    const first = p.name.split(' ')[0]!.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    await prisma.candidate.create({
      data: {
        tenantId: tenant.id,
        submissionId: sub.id,
        name: p.name,
        phone: `+55119999${String(9000 + i).padStart(4, '0')}`,
        email: `${first}.${i}@example.com`,
        jobTitle: p.jobTitle,
        department: p.department,
        birthDate: new Date(`${p.birthDate}T00:00:00Z`),
      },
    });
    await prisma.answer.createMany({ data: answers.map((a) => ({ submissionId: sub.id, ...a })) });
    await prisma.profileResult.create({
      data: {
        submissionId: sub.id,
        scoreD: profile.scores.D,
        scoreI: profile.scores.I,
        scoreS: profile.scores.S,
        scoreC: profile.scores.C,
        primaryFactor: profile.primary,
        secondaryFactor: profile.secondary,
        questionnaireVersion: questionnaire.version,
        calculatedAt: submittedAt,
      },
    });
  }

  // Convites em aberto, para o painel de convites parecer vivo.
  const open: Array<{ status: 'PENDING' | 'REVOKED'; days: number; role: string; dept: string }> = [
    { status: 'PENDING', days: 6, role: 'Analista de Dados', dept: 'Tecnologia' },
    { status: 'PENDING', days: 3, role: 'Vendedor Pleno', dept: 'Vendas' },
    { status: 'PENDING', days: 1, role: 'Assistente Administrativo', dept: 'Financeiro' },
    { status: 'REVOKED', days: 5, role: 'Estagiário de Marketing', dept: 'Marketing' },
  ];
  for (const [i, o] of open.entries()) {
    await prisma.invitation.create({
      data: {
        tenantId: tenant.id,
        questionnaireId: questionnaire.id,
        createdById: admin.id,
        tokenHash: sha(`demo-open-${i}`),
        status: o.status,
        expiresAt: new Date(now + o.days * DAY),
        targetRole: o.role,
        targetDepartment: o.dept,
      },
    });
  }

  log(`Demonstração criada: ${PEOPLE.length} resultados e ${open.length} convites em "${DEMO.company}".`);
  return { created: true as const, tenantId: tenant.id };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-demo recusado em produção: cria usuários com senha conhecida.');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? 'postgres://disc:disc@localhost:5432/disc',
    }),
  });
  try {
    const res = await seedDemo(prisma, { reset: process.argv.includes('--reset'), log: console.log });
    if (res.created) console.log(`Login: ${DEMO.adminEmail}  senha: ${DEMO.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa quando chamado como script (não quando importado pelos testes).
if (process.argv[1] && /seed-demo\.[tj]s$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
