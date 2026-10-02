import type { FactorBlock } from '@disc/contracts';
import { BulletList, Card, FACTOR_COLOR, Page, TieNotice } from '../../../shared/ui';
import type { CandidateSummary } from '../model/types';

function FactorTag({ factor }: { factor: FactorBlock['factor'] }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-7 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: FACTOR_COLOR[factor] }}
    >
      {factor}
    </span>
  );
}

function FactorCard({ role, block, tied }: { role: 'principal' | 'secundário'; block: FactorBlock; tied: boolean }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <FactorTag factor={block.factor} />
        <h2 className="font-semibold">
          Perfil {role}: {block.name}
        </h2>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-600">
        {block.headline}
        {tied && ' · mesmo peso do outro perfil'}
      </p>
      <p className="mt-2 text-slate-700">{block.description}</p>
      <h3 className="mt-3 text-sm font-semibold">Pontos fortes</h3>
      <BulletList items={block.strengths} />
    </Card>
  );
}

export function Result({ company, summary }: { company: string; summary: CandidateSummary }) {
  return (
    <Page backdrop={{ intensity: 'normal', variant: 2 }}>
      <p className="text-sm text-emerald-700">Respostas enviadas para {company}. Obrigado!</p>
      <h1 className="mt-2 text-2xl font-bold">{summary.title}</h1>
      <p className="mt-1 font-medium text-slate-600">{summary.combined.headline}</p>

      {summary.tied && summary.tieNote && (
        <div className="mt-4">
          <TieNotice>{summary.tieNote}</TieNotice>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <Card>
          <h2 className="font-semibold">Seu perfil combinado: {summary.code}</h2>
          <p className="mt-2 text-slate-700">{summary.combined.description}</p>
          <h3 className="mt-3 text-sm font-semibold">Pontos fortes</h3>
          <BulletList items={summary.combined.strengths} />
          <h3 className="mt-3 text-sm font-semibold">Dicas de desenvolvimento</h3>
          <BulletList items={summary.combined.tips} />
        </Card>

        <FactorCard role="principal" block={summary.primaryProfile} tied={summary.tied} />
        <FactorCard role="secundário" block={summary.secondaryProfile} tied={summary.tied} />
      </div>
      <p className="mt-5 text-xs text-slate-500">{summary.disclaimer}</p>
    </Page>
  );
}
