/**
 * Cloudflare Worker — CORS proxy for GitHub OAuth endpoints.
 *
 * GitHub's OAuth token endpoints do not return CORS headers, so browser
 * SPAs cannot call them directly. This worker proxies POST requests to
 * the allowed GitHub endpoints and adds the appropriate CORS headers.
 *
 * Usage:  POST https://<worker>.workers.dev/https://github.com/login/oauth/access_token
 *         POST https://<worker>.workers.dev/https://github.com/login/device/code
 */

const ALLOWED_ORIGINS = new Set([
  'https://nsheaps.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const ALLOWED_TARGETS = new Set([
  'https://github.com/login/oauth/access_token',
  'https://github.com/login/device/code',
]);

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(request, new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return corsResponse(
        request,
        new Response('Method not allowed', { status: 405 }),
      );
    }

    // The target URL is everything after the worker's origin
    const url = new URL(request.url);
    const targetUrl = url.pathname.slice(1) + url.search;

    if (!ALLOWED_TARGETS.has(targetUrl.split('?')[0]!)) {
      return corsResponse(
        request,
        new Response('Forbidden: target not allowed', { status: 403 }),
      );
    }

    // Forward the request to GitHub
    const proxyResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Accept: request.headers.get('Accept') ?? 'application/json',
        'Content-Type':
          request.headers.get('Content-Type') ??
          'application/x-www-form-urlencoded',
        'User-Agent': 'private-pages-cors-proxy',
      },
      body: request.body,
    });

    // Return the response with CORS headers
    const response = new Response(proxyResponse.body, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: {
        'Content-Type':
          proxyResponse.headers.get('Content-Type') ?? 'application/json',
      },
    });

    return corsResponse(request, response);
  },
};

function corsResponse(request: Request, response: Response): Response {
  const origin = request.headers.get('Origin') ?? '';
  const headers = new Headers(response.headers);

  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
