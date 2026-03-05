/**
 * Cloudflare Worker: GitHub OAuth CORS Proxy
 *
 * Proxies POST requests to GitHub's OAuth endpoints, adding CORS headers.
 * Only allows requests to specific GitHub OAuth paths from allowed origins.
 */

const ALLOWED_GITHUB_PATHS = new Set([
  '/login/oauth/access_token',
  '/login/device/code',
]);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://nsheaps.github.io',
];

export interface Env {
  ALLOWED_ORIGINS?: string; // comma-separated list of additional allowed origins
}

function getAllowedOrigins(env: Env): string[] {
  const extra = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  return getAllowedOrigins(env).includes(origin);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function errorResponse(status: number, message: string, origin?: string): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(origin, env)) {
        return errorResponse(403, 'Origin not allowed');
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin!) });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return errorResponse(405, 'Method not allowed');
    }

    // Origin check
    if (!isOriginAllowed(origin, env)) {
      return errorResponse(403, 'Origin not allowed');
    }

    // Extract target path from URL
    const url = new URL(request.url);
    const targetPath = url.pathname;

    if (!ALLOWED_GITHUB_PATHS.has(targetPath)) {
      return errorResponse(400, 'Path not allowed', origin!);
    }

    // Forward request to GitHub
    const githubUrl = `https://github.com${targetPath}`;
    const body = await request.text();

    const githubResponse = await fetch(githubUrl, {
      method: 'POST',
      headers: {
        'Accept': request.headers.get('Accept') ?? 'application/json',
        'Content-Type': request.headers.get('Content-Type') ?? 'application/x-www-form-urlencoded',
        'User-Agent': 'private-pages-cors-proxy',
      },
      body,
    });

    // Build response with CORS headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', githubResponse.headers.get('Content-Type') ?? 'application/json');
    for (const [key, value] of Object.entries(corsHeaders(origin!))) {
      responseHeaders.set(key, value);
    }

    return new Response(githubResponse.body, {
      status: githubResponse.status,
      headers: responseHeaders,
    });
  },
};
