import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker, { type Env } from './index';

const env: Env = {};

function request(
  url: string,
  init?: RequestInit & { headers?: Record<string, string> },
): Request {
  return new Request(url, init);
}

describe('cors-proxy worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('OPTIONS preflight', () => {
    it('returns 204 with CORS headers for allowed origin', async () => {
      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'OPTIONS',
        headers: { Origin: 'https://nsheaps.github.io' },
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://nsheaps.github.io');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });

    it('returns 403 for disallowed origin', async () => {
      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.com' },
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  describe('POST requests', () => {
    it('rejects non-POST methods', async () => {
      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'GET',
        headers: { Origin: 'https://nsheaps.github.io' },
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it('rejects disallowed origins', async () => {
      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Origin: 'https://evil.com' },
        body: 'client_id=test',
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
    });

    it('rejects disallowed paths', async () => {
      const req = request('https://proxy.example.com/api/v3/repos', {
        method: 'POST',
        headers: { Origin: 'https://nsheaps.github.io' },
        body: 'test',
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it('proxies to GitHub with CORS headers', async () => {
      const mockResponse = new Response(
        JSON.stringify({ access_token: 'gho_test', token_type: 'bearer' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Origin: 'https://nsheaps.github.io',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'client_id=test&code=abc',
      });
      const res = await worker.fetch(req, env);

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://nsheaps.github.io');

      const body = await res.json();
      expect(body).toEqual({ access_token: 'gho_test', token_type: 'bearer' });

      // Verify the proxied request
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          body: 'client_id=test&code=abc',
        }),
      );
    });

    it('proxies device code requests', async () => {
      const mockResponse = new Response(
        JSON.stringify({ device_code: 'dc_test', user_code: 'ABCD-1234' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const req = request('https://proxy.example.com/login/device/code', {
        method: 'POST',
        headers: {
          Origin: 'https://nsheaps.github.io',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'client_id=test&scope=repo',
      });
      const res = await worker.fetch(req, env);

      expect(res.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('ALLOWED_ORIGINS env var', () => {
    it('allows additional origins from env', async () => {
      const customEnv: Env = { ALLOWED_ORIGINS: 'https://custom.example.com' };
      const mockResponse = new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const req = request('https://proxy.example.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Origin: 'https://custom.example.com',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'client_id=test',
      });
      const res = await worker.fetch(req, customEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://custom.example.com');
    });
  });
});
