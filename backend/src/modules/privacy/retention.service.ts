import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { env } from '../../env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const DAY_MS = 86_400_000;

/** Remove dados pessoais além do prazo de retenção configurado por empresa (LGPD). */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.runDaily().catch((e) => this.logger.error(e)), DAY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async runDaily() {
    await this.purgeExpired();
    await this.purgePresentationTenants();
  }

  /** Apaga as empresas de apresentação (página pública /apresentacao) com mais de 7 dias, e tudo que dependia delas. */
  async purgePresentationTenants(now = new Date()): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ purge_presentation_tenants: number }>>`
      SELECT purge_presentation_tenants(${new Date(now.getTime() - 7 * DAY_MS)}::timestamptz)`;
    const total = rows[0]?.purge_presentation_tenants ?? 0;
    if (total > 0) this.logger.log(`Apresentação: ${total} empresa(s) de demonstração removida(s)`);
    return total;
  }

  /** Apaga submissões (e candidato, respostas e perfil em cascata) mais antigas que o prazo da empresa. */
  async purgeExpired(now = new Date()): Promise<number> {
    // Função SECURITY DEFINER: único ponto que percorre todas as empresas e registra a auditoria de cada uma.
    const rows = await this.prisma.$queryRaw<Array<{ purge_expired_submissions: number }>>`
      SELECT purge_expired_submissions(${now}::timestamptz)`;
    const total = rows[0]?.purge_expired_submissions ?? 0;
    if (total > 0) this.logger.log(`Retenção: ${total} submissão(ões) removida(s)`);
    return total;
  }
}
