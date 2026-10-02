/** Normaliza telefone brasileiro para E.164 (+55...). Aceita máscara. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

export function maskPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
