import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../infra/prisma/generated/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { IdentityRepository, type UserRecord } from '../application/ports.js';

@Injectable()
export class PrismaIdentityRepository extends IdentityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async createTenantWithAdmin(i: Parameters<IdentityRepository['createTenantWithAdmin']>[0]): Promise<UserRecord> {
    // O id é gerado aqui para abrir o contexto da nova empresa antes do INSERT (a política de RLS exige).
    const tenantId = randomUUID();
    try {
      const tenant = await this.prisma.withTenant(tenantId, (tx) =>
        tx.tenant.create({
          data: {
            id: tenantId,
            name: i.companyName,
            slug: i.slug,
            users: { create: { name: i.adminName, email: i.email, passwordHash: i.passwordHash, role: 'ADMIN' } },
          },
          include: { users: true },
        }),
      );
      return tenant.users[0]!;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Empresa já cadastrada');
      }
      throw e;
    }
  }

  // Login e refresh precisam achar o usuário antes de saber a empresa: usam funções SECURITY DEFINER.
  findUsersByEmail(email: string) {
    return this.prisma.$queryRaw<UserRecord[]>`SELECT * FROM auth_users_by_email(${email})`;
  }

  async findUserById(id: string) {
    const rows = await this.prisma.$queryRaw<UserRecord[]>`SELECT * FROM auth_user_by_id(${id}::uuid)`;
    return rows[0] ?? null;
  }

  async saveRefreshToken(i: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.prisma.refreshToken.create({ data: i });
  }

  async consumeRefreshToken(tokenHash: string, now: Date) {
    // updateMany condicional garante uso único mesmo com requisições concorrentes.
    const res = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (res.count === 0) return null;
    const t = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, select: { userId: true } });
    return t;
  }

  async revokeRefreshToken(tokenHash: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
