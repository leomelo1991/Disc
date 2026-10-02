import { describe, expect, it } from 'vitest';
import { maskPhone, normalizePhone } from './phone';

describe('telefone', () => {
  it('normaliza para E.164', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe('+5511999998888');
    expect(normalizePhone('1133334444')).toBe('+551133334444');
    expect(normalizePhone('')).toBe('');
  });
  it('aplica máscara', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });
});
