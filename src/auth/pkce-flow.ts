import type { AuthProvider, TokenInfo, UserInfo } from './types';
import { storeToken, loadToken, clearToken } from './token-store';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

/**
 * PKCE (Proof Key for Code Exchange) OAuth flow.
 *
 * This flow redirects to GitHub's authorization page, then the user is
 * redirected back with a `code` query parameter. The code is exchanged
 * for an access token using the PKCE verifier.
 *
 * Note: GitHub's PKCE support requires a GitHub App (not an OAuth App).
 */
export class PkceFlowProvider implements AuthProvider {
  private clientId: string;
  private scope: string;
  private redirectUri: string;

  constructor(clientId: string, scope = 'repo', redirectUri?: string) {
    this.clientId = clientId;
    this.scope = scope;
    this.redirectUri = redirectUri ?? window.location.origin + window.location.pathname;
  }

  async login(): Promise<TokenInfo> {
    // Check if we're returning from GitHub with a code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const storedState = sessionStorage.getItem('pp_pkce_state');
    const storedVerifier = sessionStorage.getItem('pp_pkce_verifier');
    const returnedState = params.get('state');

    if (code && storedState && storedVerifier && returnedState === storedState) {
      // Clean up URL and session storage
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());
      sessionStorage.removeItem('pp_pkce_state');
      sessionStorage.removeItem('pp_pkce_verifier');

      // Exchange code for token
      const token = await this.exchangeCode(code, storedVerifier);
      const user = await this.fetchUser(token.accessToken);
      await storeToken(token, user);
      return token;
    }

    // Start new PKCE flow
    const { verifier, challenge } = await generatePkceChallenge();
    const state = generateRandomState();

    sessionStorage.setItem('pp_pkce_verifier', verifier);
    sessionStorage.setItem('pp_pkce_state', state);

    const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
    authorizeUrl.searchParams.set('client_id', this.clientId);
    authorizeUrl.searchParams.set('redirect_uri', this.redirectUri);
    authorizeUrl.searchParams.set('scope', this.scope);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to GitHub — this will leave the page
    window.location.href = authorizeUrl.toString();

    // This promise never resolves in the current page load
    return new Promise(() => {});
  }

  async validateToken(token: TokenInfo): Promise<boolean> {
    try {
      const response = await fetch(`${GITHUB_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    await clearToken();
  }

  async loadStoredToken(): Promise<{ token: TokenInfo; user: UserInfo } | null> {
    const token = await loadToken();
    if (!token) return null;

    try {
      const user = await this.fetchUser(token.accessToken);
      return { token, user };
    } catch {
      await clearToken();
      return null;
    }
  }

  /**
   * Check if we have a pending PKCE callback (returning from GitHub).
   */
  hasPendingCallback(): boolean {
    const params = new URLSearchParams(window.location.search);
    return (
      params.has('code') &&
      params.has('state') &&
      sessionStorage.getItem('pp_pkce_state') !== null
    );
  }

  private async exchangeCode(
    code: string,
    verifier: string,
  ): Promise<TokenInfo> {
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        code,
        code_verifier: verifier,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new PkceError(
        `Token exchange failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      | { access_token: string; token_type: string; scope: string }
      | { error: string; error_description?: string };

    if ('error' in data) {
      throw new PkceError(
        data.error_description ?? `Token exchange error: ${data.error}`,
      );
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  private async fetchUser(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new PkceError(`Failed to fetch user info: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: number;
      login: string;
      avatar_url: string;
      name: string | null;
    };

    return {
      id: data.id,
      login: data.login,
      avatarUrl: data.avatar_url,
      name: data.name,
    };
  }
}

async function generatePkceChallenge(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge };
}

function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export class PkceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PkceError';
  }
}
