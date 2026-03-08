import type { AuthProvider, DeviceFlowState, TokenInfo, UserInfo } from './types';
import { storeToken, loadToken, clearToken } from './token-store';

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

export type DeviceFlowCallback = (state: DeviceFlowState) => void;

export class DeviceFlowProvider implements AuthProvider {
  private clientId: string;
  private scope: string;
  private corsProxy: string | undefined;
  private abortController: AbortController | null = null;

  constructor(clientId: string, scope = 'repo', corsProxy?: string) {
    this.clientId = clientId;
    this.scope = scope;
    this.corsProxy = corsProxy;
  }

  private proxyUrl(url: string): string {
    if (!this.corsProxy) return url;
    const proxy = this.corsProxy.replace(/\/+$/, '');
    return `${proxy}/${url.replace(/^https?:\/\//, '')}`;
  }

  async login(onStateChange?: DeviceFlowCallback): Promise<TokenInfo> {
    this.abortController = new AbortController();

    // Step 1: Request device code
    const deviceCode = await this.requestDeviceCode();

    onStateChange?.({
      status: 'polling',
      userCode: deviceCode.user_code,
      verificationUri: deviceCode.verification_uri,
      expiresAt: Date.now() + deviceCode.expires_in * 1000,
    });

    // Step 2: Poll for token
    const token = await this.pollForToken(
      deviceCode.device_code,
      deviceCode.interval,
      deviceCode.expires_in,
    );

    // Step 3: Fetch user info and store token
    const user = await this.fetchUser(token.accessToken);
    await storeToken(token, user);

    onStateChange?.({ status: 'success' });
    return token;
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

  cancelLogin(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scope,
    });

    let response: Response;
    try {
      response = await fetch(this.proxyUrl(GITHUB_DEVICE_CODE_URL), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body,
        signal: this.abortController?.signal,
      });
    } catch (err) {
      const hint = this.corsProxy
        ? 'The CORS proxy may not support POST requests. Try a different proxy or use PAT authentication.'
        : "GitHub's OAuth endpoints do not support browser requests (CORS). Configure a CORS proxy that supports POST, or use PAT authentication instead.";
      throw new AuthError(
        `${err instanceof Error ? err.message : 'Network error'}. ${hint}`,
      );
    }

    if (!response.ok) {
      throw new AuthError(
        `Failed to request device code: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as DeviceCodeResponse;
  }

  private async pollForToken(
    deviceCode: string,
    interval: number,
    expiresIn: number,
  ): Promise<TokenInfo> {
    const deadline = Date.now() + expiresIn * 1000;
    let pollInterval = interval * 1000;

    while (Date.now() < deadline) {
      if (this.abortController?.signal.aborted) {
        throw new AuthError('Login cancelled');
      }

      await sleep(pollInterval);

      const body = new URLSearchParams({
        client_id: this.clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      const response = await fetch(this.proxyUrl(GITHUB_TOKEN_URL), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body,
        signal: this.abortController?.signal,
      });

      const data = (await response.json()) as TokenResponse | TokenErrorResponse;

      if ('access_token' in data) {
        return {
          accessToken: data.access_token,
          tokenType: data.token_type,
          scope: data.scope,
        };
      }

      const error = data as TokenErrorResponse;
      switch (error.error) {
        case 'authorization_pending':
          // User hasn't authorized yet, keep polling
          continue;
        case 'slow_down':
          // Increase poll interval by 5 seconds
          pollInterval += 5000;
          continue;
        case 'expired_token':
          throw new AuthError('The device code has expired. Please try again.');
        case 'access_denied':
          throw new AuthError('Access was denied. The user cancelled the authorization.');
        default:
          throw new AuthError(
            error.error_description ?? `Authentication error: ${error.error}`,
          );
      }
    }

    throw new AuthError('Device code expired before authorization completed.');
  }

  private async fetchUser(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AuthError(`Failed to fetch user info: ${response.status}`);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
