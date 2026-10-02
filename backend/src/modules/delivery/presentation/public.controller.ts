import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { submitAssessmentSchema, type SubmitAssessmentDto } from '@disc/contracts';
import { MetricsService } from '../../../shared/metrics.service.js';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe.js';
import { GetPublicInvitation } from '../application/get-public-invitation.js';
import { SubmitAssessment } from '../application/submit-assessment.js';

@Controller('public/invitations')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class PublicController {
  constructor(
    @Inject(GetPublicInvitation) private readonly getInvitation: GetPublicInvitation,
    @Inject(SubmitAssessment) private readonly submit: SubmitAssessment,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.getInvitation.execute(token);
  }

  @Post(':token/submit')
  @HttpCode(201)
  async send(
    @Param('token') token: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(submitAssessmentSchema)) dto: SubmitAssessmentDto,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      throw new BadRequestException('Header Idempotency-Key obrigatório');
    }
    const { candidateSummary, replayed } = await this.submit.execute(token, idempotencyKey, dto);
    if (!replayed) this.metrics.submissions.inc();
    return { candidateSummary };
  }
}
