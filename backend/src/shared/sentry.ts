import * as Sentry from '@sentry/node';
import { env } from '../env.js';
import { scrubEvent } from './scrub-sentry.js';

/** Liga o Sentry apenas se SENTRY_DSN estiver definido. Sem DSN, nada é enviado e nada é inicializado. */
export function initSentry(): boolean {
  if (!env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    // O SDK 11 não envia PII por padrão; mesmo assim `beforeSend` limpa corpo, cookies, headers, IP e tokens.
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
  return true;
}

export function captureServerError(error: unknown) {
  if (Sentry.getClient()) Sentry.captureException(error);
}
