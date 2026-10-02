import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/client.js';
import { env } from '../../env.js';

export type TenantTx = Prisma.TransactionClient;

/**
 * Cliente conectado como `disc_app`, que está sujeito a Row Level Security.
 * Fora de `withTenant` nenhuma linha de tabela por empresa é visível ou gravável.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.APP_DATABASE_URL }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Executa `fn` numa transação em que o banco só enxerga/grava dados de `tenantId`. */
  withTenant<T>(tenantId: string, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // is_local=true: vale só até o fim desta transação (seguro com pool de conexões).
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
