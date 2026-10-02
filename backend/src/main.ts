import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { env } from './env.js';
import { initSentry } from './shared/sentry.js';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  await app.listen(env.PORT);
}
void bootstrap();
