import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PkceFlowProvider, PkceError } from './pkce-flow';

vi.mock('./token-store', () => ({
  storeToken: vi.fn().mockResolvedValue(undefined),
  loadToken: vi.fn().mockResolvedValue(null),
  clearToken: vi.fn().mockResolvedValue(undefined),
}));

describe('PkceFlowProvider', () => {
  let provider: PkceFlowProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.clear();
    provider = new PkceFlowProvider('test-client-id', 'repo', 'http://localhost:3000/');
  });

  describe('hasPendingCallback', () => {
    it('returns false with no token result in sessionStorage', () => {
      expect(provider.hasPendingCallback()).toBe(false);
    });

    it('returns true when token result exists in sessionStorage', () => {
      sessionStorage.setItem(
        'pp_pkce_token_result',
        JSON.stringify({ access_token: 'gho_test', token_type: 'bearer', scope: 'repo' }),
      );
      expect(provider.hasPendingCallback()).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('returns true for valid token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 }),
      );
      const valid = await provider.validateToken({
        accessToken: 'gho_valid',
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
        accessToken: 'gho_invalid',
        tokenType: 'bearer',
        scope: 'repo',
      });
      expect(valid).toBe(false);
    });

    it('returns false on network error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      const valid = await provider.validateToken({
        accessToken: 'gho_test',
        tokenType: 'bearer',
        scope: 'repo',
      });
      expect(valid).toBe(false);
    });
  });

  describe('login redirect', () => {
    it('stores PKCE state and verifier before redirecting', async () => {
      // login() sets location.href and returns a never-resolving promise
      const loginPromise = provider.login();
      const timeoutPromise = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), 50),
      );
      const result = await Promise.race([loginPromise, timeoutPromise]);
      expect(result).toBe('timeout');

      // Verify PKCE state, client ID, and return URL were stored in sessionStorage
      expect(sessionStorage.getItem('pp_pkce_verifier')).toBeTruthy();
      expect(sessionStorage.getItem('pp_pkce_state')).toBeTruthy();
      expect(sessionStorage.getItem('pp_pkce_client_id')).toBe('test-client-id');
      expect(sessionStorage.getItem('pp_pkce_redirect_uri')).toBe('http://localhost:3000/');
      expect(sessionStorage.getItem('pp_pkce_return_url')).toBeTruthy();
    });
  });

  describe('PkceError', () => {
    it('has correct name', () => {
      const err = new PkceError('test');
      expect(err.name).toBe('PkceError');
      expect(err.message).toBe('test');
    });
  });
});
