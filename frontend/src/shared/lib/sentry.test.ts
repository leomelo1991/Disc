import { describe, expect, it } from 'vitest';
import { deepRedact, redactText, scrubEvent } from './sentry';

describe('sentry (frontend): redação', () => {
  it('mascara o token do convite na URL da página e e-mails', () => {
    expect(redactText('https://app.x.com/t/AbC-123_xyz?utm=1')).toBe('https://app.x.com/t/:token?utm=1');
    expect(redactText('erro para maria@empresa.com.br')).toBe('erro para [email]');
    expect(redactText('/admin/resultados/123')).toBe('/admin/resultados/123');
  });

  it('redige strings aninhadas em listas e objetos (breadcrumbs de navegação)', () => {
    const out = JSON.stringify(
      deepRedact({ category: 'navigation', data: { from: '/t/TOKEN9', to: '/t/TOKEN9?x', args: ['/t/TOKEN9'] } }),
    );
    expect(out).not.toContain('TOKEN9');
    expect(out).toContain(':token');
  });

  it('remove cookies, headers, dados e IP, e mascara a URL da requisição', () => {
    const event = {
      request: {
        url: 'https://app.x.com/t/TOKEN9',
        headers: { Referer: 'https://app.x.com/t/TOKEN9' },
        cookies: { a: 'b' },
        data: 'x',
      },
      user: { id: 'u1', ip_address: '1.2.3.4', email: 'a@b.com' },
      exception: { values: [{ value: 'falhou em /t/TOKEN9 para a@b.com' }] },
    };
    const out = JSON.stringify(scrubEvent(event));
    for (const s of ['TOKEN9', '1.2.3.4', 'a@b.com', 'Referer', '"cookies"']) expect(out).not.toContain(s);
    expect(out).toContain('"id":"u1"');
  });
});
