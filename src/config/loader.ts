import { ConfigSchema, type ValidatedConfig } from './schema';

/**
 * Load config from multiple sources with priority:
 * 1. URL query parameters (for simple single-site deployments)
 * 2. Build-time env vars (VITE_PP_CONFIG as JSON string)
 * 3. Runtime JSON file (/config.json fetched at startup)
 */
export async function loadConfig(): Promise<ValidatedConfig> {
  const fromParams = loadFromUrlParams();
  if (fromParams) return fromParams;

  const fromEnv = loadFromEnvVars();
  if (fromEnv) return fromEnv;

  return loadFromJsonFile();
}

function loadFromUrlParams(): ValidatedConfig | null {
  const params = new URLSearchParams(window.location.search);
  const repo = params.get('repo');
  const clientId = params.get('client_id');

  if (!repo || !clientId) return null;

  const raw = {
    github: {
      clientId,
      authMode: params.get('auth_mode') ?? 'device-flow',
      ...(params.get('cors_proxy') ? { corsProxy: params.get('cors_proxy') } : {}),
    },
    sites: [
      {
        path: params.get('path') ?? '/',
        repo,
        branch: params.get('branch') ?? 'main',
        directory: params.get('dir') ?? '/',
        ...(params.get('ttl') ? { fetchTtlSeconds: Number(params.get('ttl')) } : {}),
      },
    ],
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

async function loadFromJsonFile(): Promise<ValidatedConfig> {
  const base = import.meta.env.BASE_URL ?? '/';
  const configUrl = `${base.endsWith('/') ? base : base + '/'}config.json`;
  let response: Response;
  try {
    response = await fetch(configUrl);
  } catch {
    throw new ConfigError(
      'No config found. Provide URL params (?repo=owner/repo&client_id=...), ' +
        'set VITE_PP_CONFIG env var, or place a config.json at the app root.',
    );
  }

  if (!response.ok) {
    throw new ConfigError(
      `Failed to load /config.json (${String(response.status)}). ` +
        'Provide config via URL params or VITE_PP_CONFIG env var instead.',
    );
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
