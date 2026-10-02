import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createUserSchema, updateTenantSchema, updateUserSchema } from '@disc/contracts';
import { Prisma } from '../../infra/prisma/generated/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { ZodValidationPipe } from '../../shared/zod-validation.pipe.js';
import { PasswordHasher } from '../identity/application/ports.js';
import type { AccessClaims } from '../identity/application/auth.service.js';
import { Auth, AuthGuard, Roles } from '../identity/presentation/auth.guard.js';

const userSelect = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

@Controller()
@UseGuards(AuthGuard)
export class TenancyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: PasswordHasher,
  ) {}

  @Get('tenant')
  tenant(@Auth() auth: AccessClaims) {
    return this.prisma.withTenant(auth.tid, (tx) =>
      tx.tenant.findUniqueOrThrow({
        where: { id: auth.tid },
        select: { id: true, name: true, slug: true, retentionDays: true },
      }),
    );
  }

  @Patch('tenant')
  @Roles('ADMIN')
  updateTenant(
    @Auth() auth: AccessClaims,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: ReturnType<typeof updateTenantSchema.parse>,
  ) {
    return this.prisma.withTenant(auth.tid, (tx) =>
      tx.tenant.update({
        where: { id: auth.tid },
        data: body,
        select: { id: true, name: true, slug: true, retentionDays: true },
      }),
    );
  }

  @Get('users')
  @Roles('ADMIN')
  async users(@Auth() auth: AccessClaims) {
    const items = await this.prisma.withTenant(auth.tid, (tx) =>
      tx.user.findMany({ where: { tenantId: auth.tid }, select: userSelect, orderBy: { createdAt: 'asc' } }),
    );
    return { items };
  }

  @Post('users')
  @Roles('ADMIN')
  async createUser(
    @Auth() auth: AccessClaims,
    @Body(new ZodValidationPipe(createUserSchema)) body: ReturnType<typeof createUserSchema.parse>,
  ) {
    try {
      const passwordHash = await this.hasher.hash(body.password);
      return await this.prisma.withTenant(auth.tid, (tx) =>
        tx.user.create({
          data: { tenantId: auth.tid, name: body.name, email: body.email.toLowerCase(), role: body.role, passwordHash },
          select: userSelect,
        }),
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException('E-mail já cadastrado');
      throw e;
    }
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  async updateUser(
    @Auth() auth: AccessClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: ReturnType<typeof updateUserSchema.parse>,
  ) {
    // Impede o admin de se rebaixar/desativar e deixar a empresa sem administrador.
    if (id === auth.sub && (body.active === false || body.role === 'RECRUITER')) {
      throw new ConflictException('Você não pode remover seu próprio acesso de administrador');
    }
    return this.prisma.withTenant(auth.tid, async (tx) => {
      const res = await tx.user.updateMany({ where: { id, tenantId: auth.tid }, data: body });
      if (res.count === 0) throw new NotFoundException();
      return tx.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    });
  }
}
