import { openDB, type IDBPDatabase } from 'idb';
import type { RepoMetadata } from './types';
import type { StoredAuth } from '../auth/types';

const DB_NAME = 'private-pages';
const DB_VERSION = 1;

interface PrivatePagesDB {
  auth: {
    key: string;
    value: StoredAuth;
  };
  repos: {
    key: string;
    value: RepoMetadata;
  };
}

let dbPromise: Promise<IDBPDatabase<PrivatePagesDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PrivatePagesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PrivatePagesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth');
        }
        if (!db.objectStoreNames.contains('repos')) {
          db.createObjectStore('repos');
        }
      },
    });
  }
  return dbPromise;
}

function repoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`;
}

// Auth store
export async function getStoredAuth(): Promise<StoredAuth | undefined> {
  const db = await getDb();
  return db.get('auth', 'current');
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  const db = await getDb();
  await db.put('auth', auth, 'current');
}

export async function clearStoredAuth(): Promise<void> {
  const db = await getDb();
  await db.delete('auth', 'current');
}

// Repo metadata store
export async function getRepoMetadata(
  owner: string,
  repo: string,
): Promise<RepoMetadata | undefined> {
  const db = await getDb();
  return db.get('repos', repoKey(owner, repo));
}

export async function setRepoMetadata(metadata: RepoMetadata): Promise<void> {
  const db = await getDb();
  await db.put('repos', metadata, repoKey(metadata.owner, metadata.repo));
}

export async function deleteRepoMetadata(
  owner: string,
  repo: string,
): Promise<void> {
  const db = await getDb();
  await db.delete('repos', repoKey(owner, repo));
}

export async function getAllRepoMetadata(): Promise<RepoMetadata[]> {
  const db = await getDb();
  return db.getAll('repos');
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['auth', 'repos'], 'readwrite');
  await Promise.all([
    tx.objectStore('auth').clear(),
    tx.objectStore('repos').clear(),
    tx.done,
  ]);
}

/** Reset the cached db connection (useful for testing) */
export function resetDbConnection(): void {
  dbPromise = null;
}
