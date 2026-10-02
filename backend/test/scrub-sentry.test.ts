import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it } from 'vitest';
import { redactToken, scrubEvent } from '../src/shared/scrub-sentry.js';

describe('scrubEvent', () => {
  it('mascara o token do convite em caminhos de API e do frontend', () => {
    expect(redactToken('GET /api/v1/public/invitations/AbC123-xyz_9/submit')).toBe(
      'GET /api/v1/public/invitations/:token/submit',
    );
    expect(redactToken('https://app.example.com/t/SEGREDO?x=1')).toBe('https://app.example.com/t/:token?x=1');
    expect(redactToken('/reports/results/123')).toBe('/reports/results/123');
  });

  it('remove corpo, cookies, headers, query, IP e e-mail do evento', () => {
    const event = {
      type: undefined,
      request: {
        url: 'http://x/api/v1/public/invitations/TOKEN123/submit',
        data: { candidate: { name: 'Maria', email: 'maria@x.com' } },
        cookies: { refresh_token: 'segredo' },
        headers: { authorization: 'Bearer abc', cookie: 'refresh_token=segredo' },
        query_string: 'a=b',
      },
      user: { id: 'u1', ip_address: '1.2.3.4', email: 'maria@x.com', username: 'maria' },
      transaction: 'GET /api/v1/public/invitations/TOKEN123',
      message: 'falha em /public/invitations/TOKEN123',
      exception: { values: [{ type: 'Error', value: 'boom em /t/TOKEN123' }] },
      breadcrumbs: [{ message: 'GET /t/TOKEN123', data: { url: '/public/invitations/TOKEN123' } }],
    } as unknown as ErrorEvent;

    const out = JSON.stringify(scrubEvent(event));
    for (const secret of ['TOKEN123', 'segredo', 'maria@x.com', '1.2.3.4', 'Bearer abc', 'Maria']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain(':token');
    expect(out).toContain('"id":"u1"'); // id interno opaco pode ficar
  });
});
