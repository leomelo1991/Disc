import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { createPresentationSchema, type PresentationLink } from '@disc/contracts';
import { api, ApiError } from '../../shared/api/http';
import { Button, Card, ErrorBox, Input } from '../../shared/ui';

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'A página de apresentação está desativada neste ambiente.';
    if (e.status === 429) return 'Muitas tentativas ou limite diário de demonstrações atingido. Aguarde um pouco.';
    if (e.status === 422) return 'Informe o nome da empresa (de 2 a 120 caracteres).';
  }
  return 'Não foi possível gerar o link agora. Tente novamente.';
}

/** QR code gerado no navegador (biblioteca carregada sob demanda). */
function QrCode({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode').then(async (m) => {
      const dataUrl = await m.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
      if (alive) setSrc(dataUrl);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  if (!src) return <div className="size-64 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />;
  return (
    <img
      src={src}
      alt="QR code do link do teste. Aponte a câmera do celular para abrir."
      className="size-64 rounded-lg border border-slate-200 bg-white p-2"
    />
  );
}

/**
 * Página pública para apresentar o produto: o cliente informa o nome da empresa e já recebe o link do teste
 * (com QR code e atalho do WhatsApp). Cada geração cria uma empresa de demonstração descartável.
 */
export function Presentation() {
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: (companyName: string) => api<PresentationLink>('/public/presentation', { body: { companyName } }),
    onMutate: () => setCopied(false),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createPresentationSchema.safeParse({
      companyName: String(new FormData(e.currentTarget).get('companyName') ?? ''),
    });
    if (!parsed.success) {
      setValidation('Informe o nome da empresa (de 2 a 120 caracteres).');
      return;
    }
    setValidation(null);
    generate.mutate(parsed.data.companyName);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const link = generate.data;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">DISC · Apresentação</p>
        <h1 className="mt-1 text-3xl font-bold md:text-4xl">Teste de perfil comportamental para a sua empresa</h1>
        <p className="mt-2 text-lg text-slate-700">
          Informe a empresa, gere o link e envie para o candidato responder pelo celular, sem cadastro.
        </p>
      </header>

      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <h2 className="text-xl font-semibold">1. Dados da empresa</h2>
          <Input
            label="Nome da empresa"
            name="companyName"
            autoComplete="organization"
            placeholder="Ex.: Aurora Talentos"
            error={validation ?? undefined}
            required
          />
          <div>
            <label htmlFor="assessment" className="mb-1 block text-sm font-medium text-slate-700">
              Tipo de teste
            </label>
            <select
              id="assessment"
              name="assessmentType"
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              defaultValue="DISC"
            >
              <option value="DISC">DISC · perfil comportamental</option>
            </select>
          </div>
          {generate.isError && <ErrorBox>{errorText(generate.error)}</ErrorBox>}
          <Button type="submit" className="w-full text-lg" disabled={generate.isPending}>
            {generate.isPending ? 'Gerando…' : '2. Gerar link do teste'}
          </Button>
        </form>
      </Card>

      {link && (
        <Card className="mt-6 border-emerald-300 bg-emerald-50 p-5">
          <h2 className="text-xl font-semibold">Link pronto para {link.companyName}</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex justify-center">
              <QrCode url={link.url} />
            </div>
            <div>
              <label htmlFor="link" className="mb-1 block text-sm font-medium text-slate-700">
                Link do teste
              </label>
              <input
                id="link"
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => void copy(link.url)}>
                  {copied ? 'Copiado!' : 'Copiar link'}
                </Button>
                <a
                  href={link.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center rounded-lg bg-green-700 px-4 font-medium text-white hover:bg-green-800"
                >
                  Enviar no WhatsApp
                </a>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-medium hover:bg-slate-50 sm:col-span-2"
                >
                  Abrir o teste agora
                </a>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                O link é de uso único e vale por 7 dias. Esta é uma empresa de demonstração: os dados são apagados
                automaticamente.
              </p>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}
