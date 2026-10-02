import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30 hover:from-indigo-700 hover:to-violet-700 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-600 disabled:shadow-none',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-indigo-700 hover:bg-indigo-100/70',
    danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-200 disabled:text-slate-600',
  }[variant];
  return (
    <button
      className={`min-h-11 rounded-lg px-4 font-medium transition motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Input({ label, error, id, ...props }, ref) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {/* text-base (16px) evita zoom automático no iOS */}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600 aria-[invalid=true]:border-red-600"
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
});

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-indigo-100 border-t-4 border-t-indigo-500 bg-white/90 p-5 shadow-md shadow-indigo-900/5 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Page({
  children,
  wide = false,
  backdrop,
}: {
  children: ReactNode;
  wide?: boolean;
  /** Aplica o fundo da identidade visual; `variant` muda qual fator domina cada canto. */
  backdrop?: { intensity?: BackdropIntensity; variant?: number };
}) {
  const main = (
    <main className={`mx-auto min-h-dvh w-full px-4 py-6 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>{children}</main>
  );
  if (!backdrop) return main;
  return (
    <div className="relative isolate overflow-hidden">
      <DiscBackdrop {...backdrop} />
      {main}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-slate-600">
      {label}
    </p>
  );
}

export const FACTOR_LABEL = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' } as const;

/** Cores com contraste adequado; a UI sempre mostra também a letra/rótulo (não depende só de cor). */
export const FACTOR_COLOR = { D: '#dc2626', I: '#d97706', S: '#16a34a', C: '#2563eb' } as const;

/**
 * Classes escritas por extenso: o Tailwind só gera classes que aparecem literalmente no código,
 * então não dá para montar `bg-red-500/${n}` em tempo de execução.
 * Ordem: D, I, S, C (mesmas cores de FACTOR_COLOR).
 */
const BACKDROP_TONES = {
  subtle: ['bg-red-500/10', 'bg-amber-400/10', 'bg-green-500/10', 'bg-blue-500/10'],
  normal: ['bg-red-500/20', 'bg-amber-400/20', 'bg-green-500/20', 'bg-blue-500/20'],
} as const;

type BackdropIntensity = keyof typeof BACKDROP_TONES;

/**
 * Fundo decorativo com as quatro cores dos fatores DISC, em manchas desfocadas.
 * Puramente visual (aria-hidden) e sem imagem para baixar.
 * O elemento pai precisa de `relative isolate overflow-hidden`.
 */
export function DiscBackdrop({
  intensity = 'normal',
  variant = 0,
}: {
  intensity?: BackdropIntensity;
  variant?: number;
}) {
  const tones = BACKDROP_TONES[intensity];
  const [d, i, s, c] = tones.map((_, k) => tones[(k + variant) % tones.length]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className={`absolute -left-24 -top-24 size-80 rounded-full blur-3xl ${d}`} />
      <div className={`absolute -right-16 top-8 size-72 rounded-full blur-3xl ${i}`} />
      <div className={`absolute -bottom-28 left-1/4 size-80 rounded-full blur-3xl ${s}`} />
      <div className={`absolute -bottom-20 -right-24 size-96 rounded-full blur-3xl ${c}`} />
    </div>
  );
}

/** Aviso de empate técnico entre o 1º e o 2º fator (contraste AA: texto escuro sobre âmbar claro). */
export function TieNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <strong className="font-semibold">Empate entre os dois perfis. </strong>
      {children}
    </div>
  );
}

/** Lista com marcadores usada nos cartões de leitura do perfil. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
