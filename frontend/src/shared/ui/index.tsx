import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-600',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-indigo-700 hover:bg-indigo-50',
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
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto min-h-dvh w-full px-4 py-6 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>{children}</main>;
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
