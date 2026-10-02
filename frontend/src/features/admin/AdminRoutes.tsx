import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Dashboard } from './pages/Dashboard';
import { Invitations } from './pages/Invitations';
import { Login } from './pages/Login';
import { ResultDetail } from './pages/ResultDetail';
import { Results } from './pages/Results';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { SessionProvider } from './session';

export function AdminRoutes() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="resultados" element={<Results />} />
          <Route path="resultados/:id" element={<ResultDetail />} />
          <Route path="convites" element={<Invitations />} />
          <Route path="usuarios" element={<Users />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SessionProvider>
  );
}
