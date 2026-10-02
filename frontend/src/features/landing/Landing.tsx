import { Link } from 'react-router-dom';
import { DiscBackdrop } from '../../shared/ui';

const STEPS = [
  {
    n: '1',
    title: 'Gere o link',
    text: 'Escolha o cargo e a validade. O link já vem pronto para enviar pelo WhatsApp.',
  },
  {
    n: '2',
    title: 'O candidato responde no celular',
    text: 'Sem cadastro e sem aplicativo. Cerca de 10 minutos, com validação a cada pergunta.',
  },
  {
    n: '3',
    title: 'Veja o resultado pronto',
    text: 'Perfil calculado, pontos fortes, pontos de atenção e perguntas sugeridas para a entrevista.',
  },
];

const FEATURES = [
  {
    title: 'Link único pelo WhatsApp',
    text: 'Cada convite é de uso único, com validade e revogação. Um toque abre a conversa com a mensagem pronta.',
  },
  {
    title: 'Feito para o celular',
    text: 'Telas pensadas a partir de 360 px, com alvos de toque confortáveis e acessibilidade verificada automaticamente.',
  },
  {
    title: 'Relatórios que ajudam a decidir',
    text: 'Filtre por pessoa, cargo, setor, período e perfil. Exporte em CSV e abra o detalhe de cada candidato.',
  },
  {
    title: 'O candidato também recebe um resumo',
    text: 'Uma leitura positiva e objetiva do próprio perfil, sem comparações com outros candidatos.',
  },
  {
    title: 'LGPD no dia a dia',
    text: 'Consentimento registrado, retenção configurável por empresa, exportação e exclusão dos dados de um titular.',
  },
  {
    title: 'Cada empresa enxerga só o que é seu',
    text: 'Isolamento entre empresas garantido pelo próprio banco de dados, com trilha de auditoria das ações.',
  },
];

export function Landing() {
  const hasDemo = Boolean(import.meta.env.VITE_DEMO_EMAIL);
  return (
    <div className="min-h-dvh text-slate-900">
      <div className="disc-stripe h-1.5" aria-hidden="true" />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 text-xl font-bold text-indigo-950">
          <span aria-hidden="true" className="grid size-7 grid-cols-2 gap-0.5">
            <i className="rounded-sm bg-red-600" />
            <i className="rounded-sm bg-amber-500" />
            <i className="rounded-sm bg-green-600" />
            <i className="rounded-sm bg-blue-600" />
          </span>
          DISC
        </span>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Entrar
        </Link>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <DiscBackdrop />
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-8 md:pt-16">
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-indigo-950 md:text-5xl">
              Teste de perfil comportamental DISC, do link no WhatsApp ao relatório pronto
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-700">
              Envie o teste, acompanhe quem respondeu e receba o perfil já calculado, com informações úteis para
              recrutadores e para o próprio candidato.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login?cadastro=1"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 font-medium text-white shadow-md shadow-indigo-600/30 hover:from-indigo-700 hover:to-violet-700"
              >
                Cadastrar minha empresa
              </Link>
              <Link
                to={hasDemo ? '/login?demo=1' : '/login'}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-white/80 px-5 font-medium text-indigo-900 hover:bg-white"
              >
                {hasDemo ? 'Ver a demonstração' : 'Já tenho conta'}
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="como" className="bg-white/50 py-12">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="como" className="text-2xl font-bold text-indigo-950">
              Como funciona
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-2xl border border-indigo-100 border-t-4 border-t-indigo-500 bg-white/90 p-5 shadow-md shadow-indigo-900/5"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 font-bold text-white"
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-slate-700">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="recursos" className="py-12">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="recursos" className="text-2xl font-bold text-indigo-950">
              O que você ganha
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border border-indigo-100 bg-white/70 p-5 shadow-sm">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-slate-700">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-100 bg-white/60 py-6">
        <p className="mx-auto max-w-5xl px-4 text-sm text-slate-600">
          O DISC descreve preferências de comportamento. Não é um diagnóstico psicológico nem deve ser o único critério
          de seleção.
        </p>
      </footer>
    </div>
  );
}
