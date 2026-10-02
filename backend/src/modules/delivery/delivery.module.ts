import { Module } from '@nestjs/common';
import { GetPublicInvitation } from './application/get-public-invitation.js';
import { Clock, DeliveryRepository } from './application/ports.js';
import { SubmitAssessment } from './application/submit-assessment.js';
import { PrismaDeliveryRepository } from './infra/prisma-delivery.repository.js';
import { PublicController } from './presentation/public.controller.js';

class SystemClock extends Clock {
  now() {
    return new Date();
  }
}

@Module({
  controllers: [PublicController],
  providers: [
    GetPublicInvitation,
    SubmitAssessment,
    { provide: DeliveryRepository, useClass: PrismaDeliveryRepository },
    { provide: Clock, useClass: SystemClock },
  ],
})
export class DeliveryModule {}
