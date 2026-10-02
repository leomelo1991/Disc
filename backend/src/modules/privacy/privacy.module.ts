import { Module } from '@nestjs/common';
import { CronController } from './cron.controller.js';
import { RetentionService } from './retention.service.js';

@Module({ controllers: [CronController], providers: [RetentionService], exports: [RetentionService] })
export class PrivacyModule {}
