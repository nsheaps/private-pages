import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceFlowProvider, AuthError } from './device-flow';

// Mock token-store module
vi.mock('./token-store', () => ({
  storeToken: vi.fn().mockResolvedValue(undefined),
  loadToken: vi.fn().mockResolvedValue(null),
  clearToken: vi.fn().mockResolvedValue(undefined),
}));

describe('DeviceFlowProvider', () => {
  let provider: DeviceFlowProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    provider = new DeviceFlowProvider('test-client-id');
  });

  describe('login', () => {
    it('requests device code and polls for token', async () => {
      const mockFetch = vi.mocked(fetch);

      // Device code request
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            device_code: 'dc-123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 0, // Use 0 for fast testing
          }),
          { status: 200 },
        ),
      );

      // Token poll - first attempt returns pending
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: 'authorization_pending' }),
          { status: 200 },
        ),
      );

      // Token poll - second attempt returns token
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'gho_test123',
            token_type: 'bearer',
            scope: 'repo',
          }),
          { status: 200 },
        ),
      );

      // User info request
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            name: 'Test User',
          }),
          { status: 200 },
        ),
      );

      const states: string[] = [];
      const token = await provider.login((state) => states.push(state.status));

      expect(token.accessToken).toBe('gho_test123');
      expect(token.scope).toBe('repo');
      expect(states).toContain('polling');
      expect(states).toContain('success');
    });

    it('throws AuthError when device code request fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response('Server error', { status: 500, statusText: 'Internal Server Error' }),
      );

      await expect(provider.login()).rejects.toThrow(AuthError);
    });

    it('throws AuthError on access_denied', async () => {
      const mockFetch = vi.mocked(fetch);

      // Device code request
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            device_code: 'dc-123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 0,
          }),
          { status: 200 },
        ),
      );

      // Token poll returns access_denied
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: 'access_denied' }),
          { status: 200 },
        ),
      );

      await expect(provider.login()).rejects.toThrow('Access was denied');
    });
  });

  describe('corsProxy', () => {
    it('prefixes GitHub URLs with CORS proxy when configured', async () => {
      const proxyProvider = new DeviceFlowProvider(
        'test-client-id',
        'repo',
        'https://proxy.example.com',
      );
      const mockFetch = vi.mocked(fetch);

      // Device code request
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            device_code: 'dc-123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 0,
          }),
          { status: 200 },
        ),
      );

      // Token poll returns token
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'gho_test123',
            token_type: 'bearer',
            scope: 'repo',
          }),
          { status: 200 },
        ),
      );

      // User info
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            login: 'testuser',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            name: 'Test User',
          }),
          { status: 200 },
        ),
      );

      await proxyProvider.login();

      expect(mockFetch.mock.calls[0]![0]).toBe(
        'https://proxy.example.com/https://github.com/login/device/code',
      );
      expect(mockFetch.mock.calls[1]![0]).toBe(
        'https://proxy.example.com/https://github.com/login/oauth/access_token',
      );
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
});
