export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly errors?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

const BASE = '/api/v1';
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAccessToken = (t: string | null) => (accessToken = t);
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

interface Options {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
}

async function raw(path: string, opts: Options): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

interface Session {
  accessToken: string;
  user: { id: string; name: string; email: string; role: 'ADMIN' | 'RECRUITER'; tenantId: string };
}

let refreshing: Promise<Session | null> | null = null;
/** Renova a sessão pelo cookie de refresh; chamadas concorrentes compartilham a mesma requisição (o refresh é de uso único). */
export function refreshSession(): Promise<Session | null> {
  refreshing ??= raw('/auth/refresh', { method: 'POST' })
    .then(async (r) => {
      if (!r.ok) return null;
      const session = (await r.json()) as Session;
      accessToken = session.accessToken;
      return session;
    })
    .catch(() => null)
    .finally(() => (refreshing = null));
  return refreshing;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && opts.auth && (await refreshSession())) res = await raw(path, opts);
  if (res.status === 401 && opts.auth) onUnauthorized?.();
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as {
      title?: string;
      code?: string;
      errors?: ApiError['errors'];
    };
    throw new ApiError(res.status, problem.title ?? 'Erro', problem.code, problem.errors);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('json') ? res.json() : res.text()) as Promise<T>;
}
