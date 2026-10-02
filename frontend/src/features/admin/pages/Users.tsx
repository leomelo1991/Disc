import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../../shared/api/http';
import { Button, Card, ErrorBox, Input, Spinner } from '../../../shared/ui';
import { useSession } from '../session';
import type { UserRow } from '../types';

export function Users() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['users'], queryFn: () => api<{ items: UserRow[] }>('/users', { auth: true }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['users'] });
  const onError = (e: unknown) =>
    setError(
      e instanceof ApiError && e.status === 409
        ? 'Operação não permitida ou e-mail já cadastrado.'
        : 'Não foi possível concluir.',
    );

  const create = useMutation({
    mutationFn: (b: object) => api('/users', { auth: true, body: b }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: (u: UserRow) => api(`/users/${u.id}`, { auth: true, method: 'PATCH', body: { active: !u.active } }),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError,
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    create.mutate(Object.fromEntries(new FormData(form)));
    form.reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuários</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input label="Nome" name="name" required />
          <Input label="E-mail" name="email" type="email" required />
          <Input
            label="Senha inicial"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
              Papel
            </label>
            <select
              id="role"
              name="role"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
            >
              <option value="RECRUITER">Recrutador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            Adicionar usuário
          </Button>
        </form>
      </Card>
      {error && <ErrorBox>{error}</ErrorBox>}
      {list.isPending && <Spinner />}
      <ul className="space-y-2">
        {list.data?.items.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium">
                {u.name} {!u.active && <span className="text-red-700">(inativo)</span>}
              </p>
              <p className="truncate text-slate-600">
                {u.email} · {u.role === 'ADMIN' ? 'Administrador' : 'Recrutador'}
              </p>
            </div>
            {u.id !== user?.id && (
              <Button variant="ghost" onClick={() => toggle.mutate(u)}>
                {u.active ? 'Desativar' : 'Reativar'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
