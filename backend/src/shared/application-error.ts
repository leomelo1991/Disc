export type ErrorKind = 'NOT_FOUND' | 'CONFLICT' | 'GONE' | 'INVALID' | 'UNAUTHORIZED' | 'RATE_LIMITED';

/** Erro de caso de uso, independente de HTTP. A camada de apresentação o traduz (ver ProblemFilter). */
export class ApplicationError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
    public readonly code?: string,
    public readonly errors?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}
