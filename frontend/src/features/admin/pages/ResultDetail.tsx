import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../shared/api/http';
import { BulletList, Button, Card, ErrorBox, FACTOR_COLOR, FACTOR_LABEL, Spinner, TieNotice } from '../../../shared/ui';
import { useSession } from '../session';
import type { ResultDetailDto } from '../types';

/** Número no padrão brasileiro (vírgula decimal). */
const fmt = (n: number) => n.toLocaleString('pt-BR');

type Details = ResultDetailDto['summary']['primaryDetails'];

/** Leitura de recrutador de um fator isolado (principal ou secundário). */
function FactorSection({
  role,
  factor,
  block,
  details,
  open,
}: {
  role: string;
  factor: 'D' | 'I' | 'S' | 'C';
  block: { name: string; headline: string; description: string; strengths: string[] };
  details: Details;
  open: boolean;
}) {
  return (
    <details open={open} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: FACTOR_COLOR[factor] }}
        >
          {factor}
        </span>
        {role}: {block.name}
      </summary>
      <p className="mt-2 text-sm font-medium text-slate-600">{block.headline}</p>
      <p className="mt-1 text-slate-700">{block.description}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Pontos fortes</h3>
          <BulletList items={block.strengths} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Atenção</h3>
          <BulletList items={details.attention} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Comunicação</h3>
          <p className="mt-2 text-slate-700">{details.communication}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Ambiente ideal</h3>
          <p className="mt-2 text-slate-700">{details.idealEnvironment}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Motivadores</h3>
          <BulletList items={details.motivators} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Perguntas sugeridas</h3>
          <BulletList items={details.interviewQuestions} />
        </div>
      </div>
    </details>
  );
}

export function ResultDetail() {
  const { id = '' } = useParams();
  const { user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const erase = useMutation({
    mutationFn: () => api(`/reports/results/${id}`, { auth: true, method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['results'] });
      await qc.invalidateQueries({ queryKey: ['summary'] });
      navigate('/admin/resultados', { replace: true });
    },
  });

  async function exportData() {
    const data = await api<unknown>(`/reports/results/${id}/data-export`, { auth: true });
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'dados-do-titular.json' });
    a.click();
    URL.revokeObjectURL(url);
  }

  const q = useQuery({
    queryKey: ['result', id],
    queryFn: () => api<ResultDetailDto>(`/reports/results/${id}`, { auth: true }),
  });
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox>Resultado não encontrado.</ErrorBox>;
  const r = q.data;
  const s = r.summary;
  return (
    <div className="space-y-4">
      <Link to="/admin/resultados" className="text-sm text-indigo-700">
        ← Resultados
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{r.candidate.name}</h1>
        <p className="text-slate-600">
          {r.candidate.jobTitle} · {r.candidate.department}
        </p>
        <p className="text-sm text-slate-500">
          {r.candidate.email} · {r.candidate.phone} · nasc. {r.candidate.birthDate.split('-').reverse().join('/')}
        </p>
      </header>

      <Card>
        <h2 className="font-semibold">{s.title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">{s.combined.headline}</p>
        <p className="mt-1 text-slate-700">{s.description}</p>
        {r.tied && (
          <div className="mt-3">
            <TieNotice>
              {FACTOR_LABEL[s.primary]} ({s.primary}) e {FACTOR_LABEL[s.secondary]} ({s.secondary}) ficaram com
              diferença de {fmt(r.gap)} p.p. (empate técnico: abaixo de 5 p.p.). A ordem é só uma convenção: considere
              os dois perfis com o mesmo peso.
            </TieNotice>
          </div>
        )}
        <ul className="mt-4 space-y-2" aria-label="Pontuação por fator">
          {(['D', 'I', 'S', 'C'] as const).map((f) => (
            <li key={f} className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-2 text-sm">
              <span className="leading-tight">
                {f} · {FACTOR_LABEL[f]}
                {f === s.primary && <strong className="block text-indigo-700">Principal</strong>}
                {f === s.secondary && <strong className="block text-indigo-700">Secundário</strong>}
              </span>
              <span className="h-3 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full" style={{ width: `${r.percentages[f]}%`, background: FACTOR_COLOR[f] }} />
              </span>
              <span className="text-right tabular-nums">
                {r.scores[f]} ({fmt(r.percentages[f])}%)
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="pt-2 text-lg font-semibold">Leitura combinada ({s.code})</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Pontos fortes</h3>
          <BulletList items={s.combined.strengths} />
        </Card>
        <Card>
          <h3 className="font-semibold">Pontos de atenção</h3>
          <BulletList items={s.attention} />
        </Card>
        <Card>
          <h3 className="font-semibold">Estilo de comunicação</h3>
          <p className="mt-2 text-slate-700">{s.communication}</p>
        </Card>
        <Card>
          <h3 className="font-semibold">Ambiente ideal</h3>
          <p className="mt-2 text-slate-700">{s.idealEnvironment}</p>
        </Card>
        <Card>
          <h3 className="font-semibold">Motivadores</h3>
          <BulletList items={s.motivators} />
        </Card>
        <Card>
          <h3 className="font-semibold">Perguntas para a entrevista</h3>
          <BulletList items={s.interviewQuestions} />
        </Card>
      </div>

      <h2 className="pt-2 text-lg font-semibold">Cada perfil em detalhe</h2>
      <FactorSection
        role="Perfil principal"
        factor={s.primary}
        block={s.primaryProfile}
        details={s.primaryDetails}
        open={r.tied}
      />
      <FactorSection
        role="Perfil secundário"
        factor={s.secondary}
        block={s.secondaryProfile}
        details={s.secondaryDetails}
        open={r.tied}
      />
      <p className="text-xs text-slate-500">{s.disclaimer}</p>

      {user?.role === 'ADMIN' && (
        <Card>
          <h2 className="font-semibold">Dados pessoais (LGPD)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Atenda pedidos do titular: exporte todos os dados dele ou exclua-os definitivamente.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void exportData()}>
              Exportar dados (JSON)
            </Button>
            {!confirming ? (
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                Excluir dados
              </Button>
            ) : (
              <>
                <Button variant="danger" disabled={erase.isPending} onClick={() => erase.mutate()}>
                  {erase.isPending ? 'Excluindo…' : 'Confirmar exclusão definitiva'}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </>
            )}
          </div>
          {erase.isError && (
            <div className="mt-3">
              <ErrorBox>Não foi possível excluir. Tente novamente.</ErrorBox>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
