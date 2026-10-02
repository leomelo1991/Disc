const TOKEN_IN_PATH = /(\/t\/)[^/?#\s"'\\]+/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MAX_DEPTH = 8;

/** Mascara o token do convite (segredo na URL /t/:token) e e-mails em qualquer texto. */
export function redactText(text: string): string {
  return text.replace(TOKEN_IN_PATH, '$1:token').replace(EMAIL, '[email]');
}

/** Redige toda string do objeto (URL da página, Referer, breadcrumbs de navegação, mensagens...). */
export function deepRedact<T>(value: T, depth = 0): T {
  if (typeof value === 'string') return redactText(value) as T;
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepRedact(v, depth + 1)) as T;
  for (const [k, v] of Object.entries(value)) (value as Record<string, unknown>)[k] = deepRedact(v, depth + 1);
  return value;
}

/** Limpa o evento antes de sair do navegador: sem cookies/headers/dados de usuário e com tokens mascarados. */
export function scrubEvent<T extends { request?: object; user?: object }>(event: T): T {
  const request = event.request as Record<string, unknown> | undefined;
  if (request) {
    delete request.cookies;
    delete request.headers;
    delete request.data;
  }
  const user = event.user as Record<string, unknown> | undefined;
  if (user) {
    delete user.ip_address;
    delete user.email;
    delete user.username;
  }
  return deepRedact(event);
}

/**
 * Liga o Sentry só se VITE_SENTRY_DSN existir (e carrega o SDK sob demanda, sem pesar o bundle do candidato).
 * Session Replay NÃO é habilitado: gravaria dados pessoais digitados no formulário.
 */
export async function initSentry(): Promise<boolean> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return false;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => deepRedact(breadcrumb),
  });
  return true;
}
