import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatFlowProvider, PatError } from './pat-flow';

vi.mock('./token-store', () => ({
  storeToken: vi.fn().mockResolvedValue(undefined),
  loadToken: vi.fn().mockResolvedValue(null),
  clearToken: vi.fn().mockResolvedValue(undefined),
}));

describe('PatFlowProvider', () => {
  let provider: PatFlowProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    provider = new PatFlowProvider();
  });

  describe('login', () => {
    it('throws when no token provided', async () => {
      await expect(provider.login()).rejects.toThrow('No token provided');
    });

    it('validates token and returns token info', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 1, login: 'testuser', avatar_url: 'https://example.com/avatar', name: 'Test' }),
          { status: 200 },
        ),
      );
      const token = await provider.login('ghp_valid');
      expect(token.accessToken).toBe('ghp_valid');
      expect(token.tokenType).toBe('bearer');
    });

    it('throws on invalid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );
      await expect(provider.login('ghp_bad')).rejects.toThrow('Invalid token: 401');
    });
  });

  describe('validateToken', () => {
    it('returns true for valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 }),
      );
      const valid = await provider.validateToken({
        accessToken: 'ghp_valid',
        tokenType: 'bearer',
        scope: 'repo',
      });
      expect(valid).toBe(true);
    });

    it('returns false for invalid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );
      const valid = await provider.validateToken({
        accessToken: 'ghp_bad',
        tokenType: 'bearer',
        scope: 'repo',
      });
      expect(valid).toBe(false);
    });
  });

  describe('PatError', () => {
    it('has correct name', () => {
      const err = new PatError('test');
      expect(err.name).toBe('PatError');
    });
  });
});
