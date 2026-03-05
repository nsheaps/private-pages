import type { AuthProvider, TokenInfo, UserInfo } from './types';
import { storeToken, loadToken, clearToken } from './token-store';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Personal Access Token auth provider.
 *
 * The user provides a PAT directly — no OAuth flow, no CORS issues.
 * The token is validated against the GitHub API, then encrypted and
 * stored in IndexedDB via the shared token-store.
 */
export class PatFlowProvider implements AuthProvider {
  async login(token?: string): Promise<TokenInfo> {
    if (!token) {
      throw new PatError('No token provided');
    }

    const tokenInfo: TokenInfo = {
      accessToken: token,
      tokenType: 'bearer',
      scope: 'repo',
    };

    const user = await this.fetchUser(token);
    await storeToken(tokenInfo, user);
    return tokenInfo;
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

  private async fetchUser(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new PatError(`Invalid token: ${response.status}`);
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

export class PatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatError';
  }
}
