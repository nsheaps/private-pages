import http from 'isomorphic-git/http/web';

/**
 * isomorphic-git onAuth callback.
 * Provides GitHub token as HTTP basic auth credentials.
 */
export function createAuthHelper(token: string) {
  return {
    onAuth: () => ({
      username: 'x-access-token',
      password: token,
    }),
  };
}

/**
 * Create an HTTP client that pre-attaches the Authorization header to every
 * request. This avoids the default 401-challenge flow, which fails through
 * CORS proxies when the unauthenticated request returns 403 (private repos)
 * and the proxy doesn't forward CORS headers on error responses.
 */
export function createAuthenticatedHttp(token: string): typeof http {
  return {
    async request(args) {
      const headers = {
        ...args.headers,
        Authorization: `Basic ${btoa(`x-access-token:${token}`)}`,
      };
      return http.request({ ...args, headers });
    },
  };
}
