import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../../shared/api/http';
import { Button, Card, ErrorBox, Input, Spinner } from '../../../shared/ui';
import type { InvitationCreated, InvitationRow } from '../types';

const STATUS: Record<string, string> = {
  PENDING: 'Aguardando',
  STARTED: 'Iniciado',
  COMPLETED: 'Concluído',
  EXPIRED: 'Expirado',
  REVOKED: 'Revogado',
};

export function Invitations() {
  const qc = useQueryClient();
  const [created, setInvitationCreated] = useState<InvitationCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const list = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api<{ items: InvitationRow[] }>('/invitations?limit=50', { auth: true }),
  });

  const create = useMutation({
    mutationFn: (v: { targetRole?: string; targetDepartment?: string; expiresInDays: number }) =>
      api<InvitationCreated>('/invitations', { auth: true, body: { assessmentType: 'DISC', ...v } }),
    onSuccess: (c) => {
      setInvitationCreated(c);
      setCopied(false);
      void qc.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/invitations/${id}/revoke`, { auth: true, method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['invitations'] }),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({
      targetRole: (f.get('role') as string) || undefined,
      targetDepartment: (f.get('dept') as string) || undefined,
      expiresInDays: Number(f.get('days')) || 7,
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Convites</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-slate-600">
            Tipo de teste: <strong>DISC</strong>
          </p>
          <Input label="Cargo (opcional)" name="role" />
          <Input label="Setor (opcional)" name="dept" />
          <Input
            label="Validade (dias)"
            name="days"
            type="number"
            min={1}
            max={90}
            defaultValue={7}
            inputMode="numeric"
          />
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Gerando…' : 'Gerar link'}
          </Button>
        </form>
        {create.isError && (
          <div className="mt-3">
            <ErrorBox>Não foi possível gerar o link.</ErrorBox>
          </div>
        )}
      </Card>

      {created && (
        <Card className="border-emerald-300 bg-emerald-50">
          <p className="text-sm font-medium">Link gerado. Ele só é exibido agora; copie ou envie.</p>
          <input
            readOnly
            aria-label="Link do convite"
            value={created.url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
          />
          <div className="mt-3 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => void copy(created.url)}>
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <a
              href={created.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-green-700 px-4 font-medium text-white hover:bg-green-800"
            >
              Enviar no WhatsApp
            </a>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Convites emitidos</h2>
        {list.isPending && <Spinner />}
        <ul className="space-y-2">
          {list.data?.items.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium">{STATUS[r.status] ?? r.status}</p>
                <p className="truncate text-slate-600">
                  {[r.targetRole, r.targetDepartment].filter(Boolean).join(' · ') || 'Sem cargo/setor'} · expira{' '}
                  {new Date(r.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {(r.status === 'PENDING' || r.status === 'STARTED') && (
                <Button variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(r.id)}>
                  Revogar
                </Button>
              )}
            </li>
          ))}
        </ul>
        {list.data?.items.length === 0 && <p className="text-slate-600">Nenhum convite emitido.</p>}
      </section>
    </div>
  );
}
