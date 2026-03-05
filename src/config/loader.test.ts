import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, ConfigError } from './loader';

describe('loadConfig', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Reset import.meta.env
    delete import.meta.env.VITE_PP_CONFIG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  function setSearchParams(params: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: params },
      writable: true,
    });
  }

  describe('from URL params', () => {
    it('loads config from URL query parameters', async () => {
      setSearchParams('?repo=org/repo&client_id=Iv1.abc&branch=gh-pages&dir=dist/');
      const config = await loadConfig();

      expect(config).not.toBeNull();
      expect(config!.github.clientId).toBe('Iv1.abc');
      expect(config!.github.authMode).toBe('pat');
      expect(config!.sites[0]?.repo).toBe('org/repo');
      expect(config!.sites[0]?.branch).toBe('gh-pages');
      expect(config!.sites[0]?.directory).toBe('dist/');
      expect(config!.sites[0]?.path).toBe('/');
    });

    it('loads config with only client_id (no repo)', async () => {
      setSearchParams('?client_id=Iv1.abc');
      const config = await loadConfig();

      expect(config).not.toBeNull();
      expect(config!.github.clientId).toBe('Iv1.abc');
      expect(config!.sites).toEqual([]);
    });

    it('uses defaults for optional URL params', async () => {
      setSearchParams('?repo=org/repo&client_id=Iv1.abc');
      const config = await loadConfig();

      expect(config).not.toBeNull();
      expect(config!.sites[0]?.branch).toBe('main');
      expect(config!.sites[0]?.directory).toBe('/');
      expect(config!.sites[0]?.fetchTtlSeconds).toBe(60);
    });

    it('throws ConfigError for invalid URL param config', async () => {
      setSearchParams('?repo=invalid&client_id=Iv1.abc');
      await expect(loadConfig()).rejects.toThrow(ConfigError);
    });
  });

  describe('from env vars', () => {
    it('loads config from VITE_PP_CONFIG env var', async () => {
      setSearchParams('');
      import.meta.env.VITE_PP_CONFIG = JSON.stringify({
        github: { clientId: 'Iv1.env' },
        sites: [{ path: '/docs', repo: 'org/docs' }],
      });

      const config = await loadConfig();
      expect(config).not.toBeNull();
      expect(config!.github.clientId).toBe('Iv1.env');
      expect(config!.sites[0]?.repo).toBe('org/docs');
    });

    it('throws ConfigError for invalid JSON in env var', async () => {
      setSearchParams('');
      import.meta.env.VITE_PP_CONFIG = 'not-json';
      await expect(loadConfig()).rejects.toThrow(ConfigError);
    });
  });

  describe('from JSON file', () => {
    it('loads config from /config.json', async () => {
      setSearchParams('');
      const mockConfig = {
        github: { clientId: 'Iv1.file' },
        sites: [{ path: '/app', repo: 'org/app' }],
      };
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockConfig), { status: 200 }),
      );

      const config = await loadConfig();
      expect(config).not.toBeNull();
      expect(config!.github.clientId).toBe('Iv1.file');
    });

    it('returns null when config.json fetch fails', async () => {
      setSearchParams('');
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it('returns null when config.json returns 404', async () => {
      setSearchParams('');
      vi.mocked(fetch).mockResolvedValue(
        new Response('Not found', { status: 404 }),
      );
      const config = await loadConfig();
      expect(config).toBeNull();
    });

    it('throws ConfigError for invalid JSON in config.json', async () => {
      setSearchParams('');
      vi.mocked(fetch).mockResolvedValue(
        new Response('not-json', { status: 200 }),
      );
      await expect(loadConfig()).rejects.toThrow(ConfigError);
    });
  });

  describe('priority', () => {
    it('URL params take priority over env vars', async () => {
      setSearchParams('?repo=org/url-repo&client_id=Iv1.url');
      import.meta.env.VITE_PP_CONFIG = JSON.stringify({
        github: { clientId: 'Iv1.env' },
        sites: [{ path: '/docs', repo: 'org/env-repo' }],
      });

      const config = await loadConfig();
      expect(config).not.toBeNull();
      expect(config!.github.clientId).toBe('Iv1.url');
      expect(config!.sites[0]?.repo).toBe('org/url-repo');
    });
  });
});
