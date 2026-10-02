import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { Button, Page, Spinner } from '../../shared/ui';
import { useSession } from './session';

export function AdminLayout() {
  const { user, ready, logout } = useSession();
  if (!ready)
    return (
      <Page>
        <Spinner />
      </Page>
    );
  if (!user) return <Navigate to="/login" replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center px-3 text-sm font-medium md:flex-none ${isActive ? 'text-indigo-700 md:border-b-2 md:border-indigo-600' : 'text-slate-600'}`;

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <span className="font-semibold">DISC</span>
          <nav
            aria-label="Principal"
            className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:static md:border-0"
          >
            <NavLink to="/admin" end className={link}>
              Painel
            </NavLink>
            <NavLink to="/admin/resultados" className={link}>
              Resultados
            </NavLink>
            <NavLink to="/admin/convites" className={link}>
              Convites
            </NavLink>
            {user.role === 'ADMIN' && (
              <NavLink to="/admin/usuarios" className={link}>
                Usuários
              </NavLink>
            )}
            {user.role === 'ADMIN' && (
              <NavLink to="/admin/configuracoes" className={link}>
                Config.
              </NavLink>
            )}
          </nav>
          <Button variant="ghost" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </header>
      <Page wide>
        <Outlet />
      </Page>
    </div>
  );
}
