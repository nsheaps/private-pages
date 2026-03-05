import { ConfigSchema, type ValidatedConfig } from './schema';

/**
 * Load config from multiple sources with priority:
 * 1. URL query parameters (for simple single-site deployments)
 * 2. Build-time env vars (VITE_PP_CONFIG as JSON string)
 * 3. Runtime JSON file (/config.json fetched at startup)
 *
 * Returns null if no config source is found (app shows setup guide).
 */
export async function loadConfig(): Promise<ValidatedConfig | null> {
  const fromParams = loadFromUrlParams();
  if (fromParams) return fromParams;

  const fromEnv = loadFromEnvVars();
  if (fromEnv) return fromEnv;

  return loadFromJsonFile();
}

function loadFromUrlParams(): ValidatedConfig | null {
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id');
  const repo = params.get('repo');

  if (!clientId) return null;

  const sites = repo
    ? [
        {
          path: params.get('path') ?? '/',
          repo,
          branch: params.get('branch') ?? 'main',
          directory: params.get('dir') ?? '/',
          ...(params.get('ttl') ? { fetchTtlSeconds: Number(params.get('ttl')) } : {}),
        },
      ]
    : [];

  const raw = {
    github: {
      clientId,
      ...(params.get('auth_mode') ? { authMode: params.get('auth_mode') } : {}),
      ...(params.get('callback_url') ? { callbackUrl: params.get('callback_url') } : {}),
      ...(params.get('cors_proxy') ? { corsProxy: params.get('cors_proxy') } : {}),
    },
    sites,
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(
      `Invalid URL parameter config: ${result.error.issues.map((i) => i.message).join(', ')}`,
    );
  }
  return result.data;
}

function loadFromEnvVars(): ValidatedConfig | null {
  const envConfig = import.meta.env.VITE_PP_CONFIG as string | undefined;
  if (!envConfig) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(envConfig);
  } catch {
    throw new ConfigError('VITE_PP_CONFIG is not valid JSON');
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(
      `Invalid env var config: ${result.error.issues.map((i) => i.message).join(', ')}`,
    );
  }
  return result.data;
}

async function loadFromJsonFile(): Promise<ValidatedConfig | null> {
  const base = import.meta.env.BASE_URL ?? '/';
  const configUrl = `${base.endsWith('/') ? base : base + '/'}config.json`;
  let response: Response;
  try {
    response = await fetch(configUrl);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError('/config.json is not valid JSON');
  }

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(
      `Invalid config.json: ${result.error.issues.map((i) => i.message).join(', ')}`,
    );
  }
  return result.data;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
