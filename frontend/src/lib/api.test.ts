import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, requestJson } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestJson', () => {
  it('returns parsed json when the response is ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, count: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestJson<{ ok: boolean; count: number }>('/api/test')).resolves.toEqual({
      ok: true,
      count: 2,
    });
  });

  it('throws ApiError using detail or message from a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Falha específica' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestJson('/api/test')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Falha específica',
    });
  });

  it('throws when the payload is not valid json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(requestJson('/api/test')).rejects.toThrow('Resposta inválida');
  });

  it('propagates network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(requestJson('/api/test')).rejects.toThrow('Failed to fetch')
  })
});
