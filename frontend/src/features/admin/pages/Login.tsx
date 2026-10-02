import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api/http';
import { Button, Card, DiscBackdrop, ErrorBox, Input, Page } from '../../../shared/ui';
import { useSession } from '../session';

export function Login() {
  const { user, login, register } = useSession();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('cadastro') === '1' ? 'register' : 'login');
  // Conta de demonstração (só existe se o build definir VITE_DEMO_EMAIL/VITE_DEMO_PASSWORD; as credenciais são públicas por natureza).
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL as string | undefined;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD as string | undefined;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/admin" replace />;

  async function enterDemo() {
    if (!demoEmail || !demoPassword) return;
    setBusy(true);
    setError(null);
    try {
      await login(demoEmail, demoPassword);
    } catch {
      setError('A conta de demonstração não está disponível agora.');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = Object.fromEntries(f) as Record<string, string>;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(v.email!, v.password!);
      else
        await register({
          companyName: v.companyName!,
          adminName: v.adminName!,
          email: v.email!,
          password: v.password!,
        });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'E-mail ou senha incorretos.'
          : err instanceof ApiError && err.status === 409
            ? 'Esta empresa já está cadastrada.'
            : err instanceof ApiError && err.status === 422
              ? 'Confira os dados (senha com no mínimo 8 caracteres).'
              : err instanceof ApiError && err.status === 429
                ? 'Muitas tentativas. Aguarde um minuto.'
                : 'Não foi possível entrar agora.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <DiscBackdrop intensity="subtle" />
      <Page>
        <Card>
          <h1 className="mb-4 text-2xl font-bold">{mode === 'login' ? 'Entrar' : 'Cadastrar empresa'}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Input label="Nome da empresa" name="companyName" required />
                <Input label="Seu nome" name="adminName" autoComplete="name" required />
              </>
            )}
            <Input label="E-mail" name="email" type="email" autoComplete="email" required />
            <Input
              label="Senha"
              name="password"
              type="password"
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Cadastrar minha empresa' : 'Já tenho conta'}
          </Button>
          {demoEmail && demoPassword && (
            <Button variant="secondary" className="mt-3 w-full" disabled={busy} onClick={() => void enterDemo()}>
              Entrar na demonstração (dados fictícios)
            </Button>
          )}
        </Card>
      </Page>
    </div>
  );
}
