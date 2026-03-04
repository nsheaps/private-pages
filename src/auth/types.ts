export interface TokenInfo {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: number;
}

export interface UserInfo {
  id: number;
  login: string;
  avatarUrl: string;
  name: string | null;
}

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; token: TokenInfo; user: UserInfo }
  | { status: 'error'; error: string };

export interface AuthProvider {
  login(): Promise<TokenInfo>;
  validateToken(token: TokenInfo): Promise<boolean>;
  logout(): Promise<void>;
}

export interface StoredAuth {
  encryptedToken: ArrayBuffer;
  iv: Uint8Array;
  githubUserId: number;
  githubLogin: string;
  tokenExpiresAt: number;
  scopes: string[];
}
