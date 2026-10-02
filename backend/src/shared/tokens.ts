import { createHash, randomBytes } from 'node:crypto';

/** Token aleatório de 256 bits, URL-safe. Só o hash é persistido. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
