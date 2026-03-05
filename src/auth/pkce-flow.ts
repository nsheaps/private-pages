import type { AuthProvider, TokenInfo, UserInfo } from './types';
import { storeToken, loadToken, clearToken } from './token-store';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_API_URL = 'https://api.github.com';

/**
 * PKCE (Proof Key for Code Exchange) OAuth flow.
 *
 * The token exchange is handled by the shared /auth/callback page.
 * This provider stores PKCE parameters in sessionStorage before
 * redirecting to GitHub, and reads the token result from
 * sessionStorage when the callback page redirects back.
 *
 * Note: GitHub's PKCE support requires a GitHub App (not an OAuth App).
 */
export class PkceFlowProvider implements AuthProvider {
  private clientId: string;
  private scope: string;
  private redirectUri: string;
  private corsProxy: string | undefined;

  constructor(clientId: string, scope = 'repo', redirectUri?: string, corsProxy?: string) {
    this.clientId = clientId;
    this.scope = scope;
    this.redirectUri = redirectUri ?? window.location.origin + window.location.pathname;
    this.corsProxy = corsProxy;
  }

  async login(): Promise<TokenInfo> {
    // Check if the callback page already exchanged the code for a token
    const tokenResult = sessionStorage.getItem('pp_pkce_token_result');
    if (tokenResult) {
      sessionStorage.removeItem('pp_pkce_token_result');
      const data = JSON.parse(tokenResult) as {
        access_token: string;
        token_type: string;
        scope: string;
      };
      const token: TokenInfo = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
      };
      const user = await this.fetchUser(token.accessToken);
      await storeToken(token, user);
      return token;
    }

    // Start new PKCE flow
    const { verifier, challenge } = await generatePkceChallenge();
    const state = generateRandomState();

    sessionStorage.setItem('pp_pkce_verifier', verifier);
    sessionStorage.setItem('pp_pkce_state', state);
    sessionStorage.setItem('pp_pkce_client_id', this.clientId);
    sessionStorage.setItem('pp_pkce_redirect_uri', this.redirectUri);
    sessionStorage.setItem('pp_pkce_return_url', window.location.origin + window.location.pathname);
    if (this.corsProxy) {
      sessionStorage.setItem('pp_pkce_cors_proxy', this.corsProxy);
    }

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
   * Check if the callback page completed a token exchange.
   */
  hasPendingCallback(): boolean {
    return sessionStorage.getItem('pp_pkce_token_result') !== null;
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
