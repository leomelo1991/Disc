import { Module } from '@nestjs/common';
import { PresentationController } from './presentation.controller.js';

@Module({ controllers: [PresentationController] })
export class PresentationModule {}
