import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../shared/api/http';
import { Card, FACTOR_COLOR, FACTOR_LABEL, Spinner } from '../../../shared/ui';
import type { ResultsPage } from '../types';

export function Dashboard() {
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () =>
      api<{ total: number; byFactor: Record<'D' | 'I' | 'S' | 'C', number> }>('/reports/summary', { auth: true }),
  });
  const recent = useQuery({
    queryKey: ['results', 'recent'],
    queryFn: () => api<ResultsPage>('/reports/results?limit=5', { auth: true }),
  });

  if (summary.isPending) return <Spinner />;
  const s = summary.data;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Painel</h1>
      <Card>
        <p className="text-sm text-slate-600">Testes concluídos</p>
        <p className="text-4xl font-bold">{s?.total ?? 0}</p>
        <ul className="mt-4 space-y-2">
          {(['D', 'I', 'S', 'C'] as const).map((f) => {
            const n = s?.byFactor[f] ?? 0;
            const pct = s?.total ? Math.round((n / s.total) * 100) : 0;
            return (
              <li key={f} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-sm">
                <span>
                  {f} · {FACTOR_LABEL[f]}
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full" style={{ width: `${pct}%`, background: FACTOR_COLOR[f] }} />
                </span>
                <span className="text-right tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
      </Card>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Últimos resultados</h2>
          <Link to="/admin/resultados" className="text-sm text-indigo-700">
            Ver todos
          </Link>
        </div>
        {recent.data?.items.length === 0 && (
          <p className="text-slate-600">Nenhum resultado ainda. Gere um convite para começar.</p>
        )}
        <ul className="space-y-2">
          {recent.data?.items.map((r) => (
            <li key={r.id}>
              <Link to={`/admin/resultados/${r.id}`} className="block rounded-lg border border-slate-200 bg-white p-3">
                <span className="font-medium">{r.candidate.name}</span>
                <span className="ml-2 text-sm text-slate-600">
                  {r.candidate.jobTitle} · {r.primaryFactor}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
