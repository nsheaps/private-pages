import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
} from '../storage/idb';
import type { StoredAuth, TokenInfo, UserInfo } from './types';

const ENCRYPTION_KEY_NAME = 'private-pages-encryption-key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Try to load existing key from OPFS
  try {
    const root = await navigator.storage.getDirectory();
    const secretsDir = await root.getDirectoryHandle('private-pages-secrets', {
      create: true,
    });
    const keyFileHandle = await secretsDir.getFileHandle('encryption-key', {
      create: false,
    });
    const keyFile = await keyFileHandle.getFile();
    const rawKey = await keyFile.arrayBuffer();
    return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  } catch {
    // Key doesn't exist, create one
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  // Store the raw key bytes in OPFS
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const root = await navigator.storage.getDirectory();
  const secretsDir = await root.getDirectoryHandle('private-pages-secrets', {
    create: true,
  });
  const keyFileHandle = await secretsDir.getFileHandle('encryption-key', {
    create: true,
  });
  const writable = await keyFileHandle.createWritable();
  await writable.write(rawKey);
  await writable.close();

  // Re-import as non-extractable for use
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encryptToken(token: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(token);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return { ciphertext, iv };
}

async function decryptToken(ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

export async function storeToken(
  token: TokenInfo,
  user: UserInfo,
): Promise<void> {
  const { ciphertext, iv } = await encryptToken(token.accessToken);
  const stored: StoredAuth = {
    encryptedToken: ciphertext,
    iv,
    githubUserId: user.id,
    githubLogin: user.login,
    tokenExpiresAt: token.expiresAt ?? 0,
    scopes: token.scope.split(',').map((s) => s.trim()),
  };
  await setStoredAuth(stored);
}

export async function loadToken(): Promise<TokenInfo | null> {
  const stored = await getStoredAuth();
  if (!stored) return null;

  try {
    const accessToken = await decryptToken(
      stored.encryptedToken,
      stored.iv,
    );
    return {
      accessToken,
      tokenType: 'bearer',
      scope: stored.scopes.join(','),
      expiresAt: stored.tokenExpiresAt || undefined,
    };
  } catch {
    // Decryption failed (key changed, data corrupted) — clear stored data
    await clearStoredAuth();
    return null;
  }
}

export async function clearToken(): Promise<void> {
  await clearStoredAuth();
}

/** Exported for testing only */
export { getOrCreateEncryptionKey as _getOrCreateEncryptionKey, ENCRYPTION_KEY_NAME as _ENCRYPTION_KEY_NAME };
