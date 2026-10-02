import { generateToken } from './tokens.js';

/** Identificador legível e único para a empresa: nome sem acentos + sufixo aleatório. */
export function slugify(name: string, fallback = 'empresa'): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || fallback}-${generateToken()
    .slice(0, 6)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, 'x')}`;
}
