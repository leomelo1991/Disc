import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError, type ErrorKind } from './application-error.js';
import { captureServerError } from './sentry.js';

const STATUS: Record<ErrorKind, number> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  GONE: HttpStatus.GONE,
  INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
};

/** Erros no formato RFC 7807 (application/problem+json). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof ApplicationError) {
      res
        .status(STATUS[exception.kind])
        .type('application/problem+json')
        .json({
          type: 'about:blank',
          title: exception.message,
          status: STATUS[exception.kind],
          ...(exception.errors ? { errors: exception.errors } : {}),
          ...(exception.code ? { code: exception.code } : {}),
        });
      return;
    }
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      captureServerError(exception);
    }

    const extra = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: status >= 500 ? 'Erro interno' : ((extra.message as string) ?? 'Erro'),
        status,
        ...(status < 500 && extra.errors ? { errors: extra.errors } : {}),
        ...(extra.code ? { code: extra.code } : {}),
      });
  }
}
