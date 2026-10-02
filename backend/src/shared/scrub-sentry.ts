import type { ErrorEvent } from '@sentry/node';

const TOKEN_IN_PATH = /(\/(?:public\/invitations|t)\/)[^/?#\s"'\\]+/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MAX_DEPTH = 8;

/** Remove do texto o token do convite (segredo de acesso) e e-mails (dado pessoal). */
export function redactToken(text: string): string {
  return text.replace(TOKEN_IN_PATH, '$1:token').replace(EMAIL, '[email]');
}

/** Percorre objetos/listas e redige TODA string, onde quer que o Sentry a tenha colocado (extra, breadcrumbs, args...). */
function deepRedact<T>(value: T, depth = 0): T {
  if (typeof value === 'string') return redactToken(value) as T;
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepRedact(v, depth + 1)) as T;
  for (const [k, v] of Object.entries(value)) (value as Record<string, unknown>)[k] = deepRedact(v, depth + 1);
  return value;
}

/**
 * Limpa o evento antes de sair do processo: sem corpo da requisição (dados pessoais), sem cookies/headers
 * de autenticação, sem IP/e-mail do usuário, e com token de convite e e-mails mascarados em qualquer texto.
 */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    delete event.request.headers;
  }
  if (event.user) {
    delete event.user.ip_address;
    delete event.user.email;
    delete event.user.username;
  }
  return deepRedact(event);
}
