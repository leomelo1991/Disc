import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Page, Spinner } from '../shared/ui';

// Code-splitting: o candidato não baixa o código do painel administrativo (e vice-versa).
const CandidateFlow = lazy(() =>
  import('../features/candidate/CandidateFlow').then((m) => ({ default: m.CandidateFlow })),
);
const Landing = lazy(() => import('../features/landing/Landing').then((m) => ({ default: m.Landing })));
const Presentation = lazy(() =>
  import('../features/presentation/Presentation').then((m) => ({ default: m.Presentation })),
);
const AdminRoutes = lazy(() => import('../features/admin/AdminRoutes').then((m) => ({ default: m.AdminRoutes })));

export function App() {
  return (
    <Suspense
      fallback={
        <Page>
          <Spinner />
        </Page>
      }
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apresentacao" element={<Presentation />} />
        <Route path="/t/:token" element={<CandidateFlow />} />
        <Route path="/*" element={<AdminRoutes />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
