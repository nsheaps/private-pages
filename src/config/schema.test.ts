import { describe, it, expect } from 'vitest';
import { ConfigSchema } from './schema';

describe('ConfigSchema', () => {
  it('validates a valid config', () => {
    const config = {
      github: {
        clientId: 'Iv1.abc123',
        authMode: 'device-flow',
      },
      sites: [
        {
          path: '/docs',
          repo: 'myorg/internal-docs',
          branch: 'main',
          directory: 'build/',
          fetchTtlSeconds: 60,
        },
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const config = {
      github: {
        clientId: 'Iv1.abc123',
      },
      sites: [
        {
          path: '/docs',
          repo: 'myorg/internal-docs',
        },
      ],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.github.authMode).toBe('device-flow');
      expect(result.data.sites[0]?.branch).toBe('main');
      expect(result.data.sites[0]?.directory).toBe('/');
      expect(result.data.sites[0]?.fetchTtlSeconds).toBe(60);
    }
  });

  it('rejects config with no sites', () => {
    const config = {
      github: { clientId: 'Iv1.abc123' },
      sites: [],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects invalid repo format', () => {
    const config = {
      github: { clientId: 'Iv1.abc123' },
      sites: [{ path: '/docs', repo: 'invalid-no-slash' }],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects site path not starting with /', () => {
    const config = {
      github: { clientId: 'Iv1.abc123' },
      sites: [{ path: 'docs', repo: 'org/repo' }],
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
