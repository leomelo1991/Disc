import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { updateTenantSchema, type Tenant } from '@disc/contracts';
import { api, ApiError } from '../../../shared/api/http';
import { Button, Card, ErrorBox, Input, Spinner } from '../../../shared/ui';

export function Settings() {
  const qc = useQueryClient();
  const tenant = useQuery({ queryKey: ['tenant'], queryFn: () => api<Tenant>('/tenant', { auth: true }) });
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const save = useMutation({
    mutationFn: (body: { name: string; retentionDays: number }) =>
      api<Tenant>('/tenant', { auth: true, method: 'PATCH', body }),
    onSuccess: (t) => {
      qc.setQueryData(['tenant'], t);
      setMessage({ kind: 'ok', text: 'Configurações salvas.' });
    },
    onError: (e) =>
      setMessage({
        kind: 'error',
        text: e instanceof ApiError && e.status === 422 ? 'Confira os valores informados.' : 'Não foi possível salvar.',
      }),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = updateTenantSchema.safeParse({
      name: String(f.get('name') ?? ''),
      retentionDays: Number(f.get('retentionDays')),
    });
    if (!parsed.success) {
      setMessage({ kind: 'error', text: parsed.error.issues[0]?.message ?? 'Valores inválidos.' });
      return;
    }
    setMessage(null);
    save.mutate({ name: parsed.data.name!, retentionDays: parsed.data.retentionDays! });
  }

  if (tenant.isPending) return <Spinner />;
  if (tenant.isError) return <ErrorBox>Não foi possível carregar as configurações.</ErrorBox>;
  const t = tenant.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input label="Nome da empresa" name="name" defaultValue={t.name} required />
          <div>
            <Input
              label="Retenção dos dados (dias)"
              name="retentionDays"
              type="number"
              inputMode="numeric"
              min={30}
              max={3650}
              defaultValue={t.retentionDays}
              aria-describedby="retention-help"
            />
            <p id="retention-help" className="mt-1 text-sm text-slate-600">
              Resultados mais antigos que este prazo são apagados automaticamente (LGPD). Entre 30 e 3650 dias.
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Identificador da empresa: <code>{t.slug}</code>
          </p>
          {message &&
            (message.kind === 'ok' ? (
              <p role="status" className="text-sm text-emerald-800">
                {message.text}
              </p>
            ) : (
              <ErrorBox>{message.text}</ErrorBox>
            ))}
          <Button type="submit" className="w-full md:w-auto" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
