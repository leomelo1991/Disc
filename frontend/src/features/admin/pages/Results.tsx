import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../shared/api/http';
import { Button, Card, Input, Spinner } from '../../../shared/ui';
import type { ResultsPage } from '../types';

type Filters = Record<string, string>;

function toQuery(f: Filters, cursor?: string) {
  const p = new URLSearchParams({ limit: '20' });
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

export function Results() {
  const [filters, setFilters] = useState<Filters>({});
  const [open, setOpen] = useState(false);
  const q = useInfiniteQuery({
    queryKey: ['results', filters],
    queryFn: ({ pageParam }) => api<ResultsPage>(`/reports/results?${toQuery(filters, pageParam)}`, { auth: true }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFilters(Object.fromEntries(new FormData(e.currentTarget)) as Filters);
    setOpen(false);
  }

  async function exportCsv() {
    const text = await api<string>(`/reports/results/export.csv?${toQuery(filters)}`, { auth: true });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'resultados.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resultados</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            Filtros
          </Button>
          <Button variant="secondary" onClick={() => void exportCsv()}>
            CSV
          </Button>
        </div>
      </div>

      {open && (
        <Card>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
            <Input label="Nome" name="q" defaultValue={filters.q} />
            <Input label="Cargo" name="jobTitle" defaultValue={filters.jobTitle} />
            <Input label="Setor" name="department" defaultValue={filters.department} />
            <div>
              <label htmlFor="pf" className="mb-1 block text-sm font-medium text-slate-700">
                Perfil primário
              </label>
              <select
                id="pf"
                name="primaryFactor"
                defaultValue={filters.primaryFactor ?? ''}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              >
                <option value="">Todos</option>
                <option value="D">D · Dominância</option>
                <option value="I">I · Influência</option>
                <option value="S">S · Estabilidade</option>
                <option value="C">C · Conformidade</option>
              </select>
            </div>
            <Input label="De" name="from" type="date" defaultValue={filters.from} />
            <Input label="Até" name="to" type="date" defaultValue={filters.to} />
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" className="flex-1">
                Aplicar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFilters({});
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {q.isPending && <Spinner />}
      {q.isSuccess && rows.length === 0 && (
        <p className="py-8 text-center text-slate-600">Nenhum resultado para os filtros atuais.</p>
      )}

      {/* Mobile: cartões */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={r.id} className="block rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium">{r.candidate.name}</p>
              <p className="text-sm text-slate-600">
                {r.candidate.jobTitle} · {r.candidate.department}
              </p>
              <p className="mt-1 text-sm">
                Perfil <strong>{r.code}</strong>
                {r.tied ? ' (empate)' : ''} · {new Date(r.submittedAt).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      {rows.length > 0 && (
        <table className="hidden w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left text-sm md:table">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link to={r.id} className="font-medium text-indigo-700 hover:underline">
                    {r.candidate.name}
                  </Link>
                </td>
                <td className="p-3">{r.candidate.jobTitle}</td>
                <td className="p-3">{r.candidate.department}</td>
                <td className="p-3">
                  <strong>{r.code}</strong>
                  {r.tied ? ' (empate)' : ''}
                </td>
                <td className="p-3">{new Date(r.submittedAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {q.hasNextPage && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={q.isFetchingNextPage}
          onClick={() => void q.fetchNextPage()}
        >
          {q.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </div>
  );
}
