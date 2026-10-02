import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '@disc/contracts';
import { api, refreshSession, setAccessToken, setUnauthorizedHandler } from '../../shared/api/http';

export type { SessionUser } from '@disc/contracts';

interface Ctx {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (v: { companyName: string; adminName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const apply = (res: { user: SessionUser; accessToken: string }) => {
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
    // Restaura a sessão pelo cookie de refresh (o access token vive só em memória).
    void refreshSession().then((session) => {
      if (session) setUser(session.user);
      setReady(true);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => apply(await api('/auth/login', { body: { email, password } })),
    [],
  );
  const register = useCallback(
    async (v: Parameters<Ctx['register']>[0]) => apply(await api('/auth/register-tenant', { body: v })),
    [],
  );
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}
