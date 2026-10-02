import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { SubmitAssessmentDto } from '@disc/contracts';
import { api, ApiError } from '../../shared/api/http';
import { Button, Card, ErrorBox, Page, Spinner } from '../../shared/ui';
import { clearDraft, loadDraft, loadResult, newIdempotencyKey, saveDraft, saveResult, type Draft } from './model/draft';
import { EMPTY_IDENTIFICATION, identificationSchema, type IdentificationInput } from './model/identification';
import { answeredCount, isGroupComplete, toAnswers } from './model/ranking';
import type { CandidateSummary, PublicInvitation } from './model/types';
import { Identification } from './ui/Identification';
import { QuestionGroup } from './ui/QuestionGroup';
import { Result } from './ui/Result';

const CONSENT_VERSION = '2026-10';

export function CandidateFlow() {
  const { token = '' } = useParams();
  const invitation = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api<PublicInvitation>(`/public/invitations/${encodeURIComponent(token)}`),
    retry: false,
  });
  const [stored] = useState(() => loadResult<CandidateSummary>(token));

  if (stored) return <Result company={invitation.data?.company ?? 'a empresa'} summary={stored} />;
  if (invitation.isPending)
    return (
      <Page>
        <Spinner />
      </Page>
    );
  if (invitation.isError) {
    return (
      <Page backdrop={{ intensity: 'subtle', variant: 3 }}>
        <h1 className="text-xl font-semibold">Link indisponível</h1>
        <p className="mt-2 text-slate-600">
          Este link é inválido, expirou ou já foi utilizado. Peça um novo link a quem o enviou.
        </p>
      </Page>
    );
  }
  return <Flow token={token} invitation={invitation.data} />;
}

function Flow({ token, invitation }: { token: string; invitation: PublicInvitation }) {
  const groups = invitation.questionnaire.groups;
  const [draft, setDraft] = useState<Draft>(
    () =>
      loadDraft(token) ?? {
        candidate: { ...EMPTY_IDENTIFICATION },
        consent: false,
        ranks: {},
        step: 'welcome',
        groupIndex: 0,
        idempotencyKey: newIdempotencyKey(),
      },
  );
  const [summary, setSummary] = useState<CandidateSummary | null>(null);
  useEffect(() => saveDraft(token, draft), [token, draft]);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = useMutation({
    mutationFn: () => {
      const candidate = identificationSchema.parse(draft.candidate);
      const body: SubmitAssessmentDto = {
        candidate,
        consent: { accepted: true, version: CONSENT_VERSION },
        answers: toAnswers(draft.ranks),
      };
      // A mesma Idempotency-Key é reutilizada em novas tentativas: reenvio nunca duplica.
      return api<{ candidateSummary: CandidateSummary }>(`/public/invitations/${encodeURIComponent(token)}/submit`, {
        body,
        headers: { 'Idempotency-Key': draft.idempotencyKey },
      });
    },
    onSuccess: (res) => {
      saveResult(token, res.candidateSummary);
      clearDraft(token);
      setSummary(res.candidateSummary);
    },
  });

  const pending = useMemo(() => groups.length - answeredCount(groups, draft.ranks), [groups, draft.ranks]);

  if (summary) return <Result company={invitation.company} summary={summary} />;

  return (
    <Page backdrop={{ intensity: 'subtle', variant: 2 }}>
      {draft.step === 'welcome' && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Teste de perfil comportamental</h1>
          <p className="text-slate-700">
            <strong>{invitation.company}</strong> convidou você para responder um teste DISC. Leva cerca de 10 minutos e
            não há respostas certas ou erradas.
          </p>
          <Card>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={draft.consent}
                onChange={(e) => patch({ consent: e.target.checked })}
              />
              <span>
                Concordo em compartilhar meus dados e respostas com <strong>{invitation.company}</strong> para fins de
                processo seletivo e desenvolvimento, conforme a LGPD.
              </span>
            </label>
          </Card>
          <Button className="w-full" disabled={!draft.consent} onClick={() => patch({ step: 'identify' })}>
            Continuar
          </Button>
        </section>
      )}

      {draft.step === 'identify' && (
        <Identification
          defaults={{
            ...draft.candidate,
            jobTitle: draft.candidate.jobTitle || invitation.targetRole || '',
            department: draft.candidate.department || invitation.targetDepartment || '',
          }}
          onBack={() => patch({ step: 'welcome' })}
          onChange={(v: IdentificationInput) => patch({ candidate: v as unknown as Record<string, string> })}
          onSubmit={(v) => patch({ candidate: v as unknown as Record<string, string>, step: 'questions' })}
        />
      )}

      {draft.step === 'questions' && groups[draft.groupIndex] && (
        <QuestionGroup
          key={groups[draft.groupIndex]!.id}
          index={draft.groupIndex}
          total={groups.length}
          group={groups[draft.groupIndex]!}
          ranks={draft.ranks}
          onRanks={(ranks) => patch({ ranks })}
          onPrev={() =>
            draft.groupIndex === 0 ? patch({ step: 'identify' }) : patch({ groupIndex: draft.groupIndex - 1 })
          }
          onNext={() =>
            draft.groupIndex === groups.length - 1
              ? patch({ step: 'review' })
              : patch({ groupIndex: draft.groupIndex + 1 })
          }
          isLast={draft.groupIndex === groups.length - 1}
        />
      )}

      {draft.step === 'review' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Revise suas respostas</h2>
          <ol className="grid grid-cols-6 gap-2">
            {groups.map((g, i) => {
              const ok = isGroupComplete(
                g.options.map((o) => o.id),
                draft.ranks,
              );
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    aria-label={`Pergunta ${i + 1}: ${ok ? 'respondida' : 'pendente'}`}
                    onClick={() => patch({ step: 'questions', groupIndex: i })}
                    className={`min-h-11 w-full rounded-lg border text-sm font-medium ${ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'}`}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          {pending > 0 && <ErrorBox>{pending} pergunta(s) pendente(s). Toque no número para responder.</ErrorBox>}
          {submit.isError && <SubmitError error={submit.error} />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => patch({ step: 'questions', groupIndex: groups.length - 1 })}>
              Voltar
            </Button>
            <Button className="flex-1" disabled={pending > 0 || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? 'Enviando…' : submit.isError ? 'Tentar novamente' : 'Enviar respostas'}
            </Button>
          </div>
        </section>
      )}
    </Page>
  );
}

function SubmitError({ error }: { error: unknown }) {
  if (error instanceof ApiError) {
    if (error.status === 409) return <ErrorBox>Este link já foi utilizado.</ErrorBox>;
    if (error.status === 410) return <ErrorBox>O link expirou ou foi cancelado. Peça um novo link.</ErrorBox>;
    if (error.status === 422) return <ErrorBox>Algum dado está inválido. Revise suas respostas e seus dados.</ErrorBox>;
  }
  return <ErrorBox>Não foi possível enviar agora. Suas respostas estão salvas; tente novamente.</ErrorBox>;
}
