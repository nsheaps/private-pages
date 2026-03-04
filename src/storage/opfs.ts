import type { StorageUsage } from './types';

const ROOT_DIR = 'private-pages';
const REPOS_DIR = 'repos';

export async function getPrivatePagesRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(ROOT_DIR, { create: true });
}

export async function getReposDir(): Promise<FileSystemDirectoryHandle> {
  const ppRoot = await getPrivatePagesRoot();
  return ppRoot.getDirectoryHandle(REPOS_DIR, { create: true });
}

export async function getRepoDir(
  owner: string,
  repo: string,
): Promise<FileSystemDirectoryHandle> {
  const reposDir = await getReposDir();
  const ownerDir = await reposDir.getDirectoryHandle(owner, { create: true });
  return ownerDir.getDirectoryHandle(`${repo}.git`, { create: true });
}

export async function repoExists(
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    const reposDir = await getReposDir();
    const ownerDir = await reposDir.getDirectoryHandle(owner);
    await ownerDir.getDirectoryHandle(`${repo}.git`);
    return true;
  } catch {
    return false;
  }
}

export async function deleteRepo(
  owner: string,
  repo: string,
): Promise<void> {
  try {
    const reposDir = await getReposDir();
    const ownerDir = await reposDir.getDirectoryHandle(owner);
    await ownerDir.removeEntry(`${repo}.git`, { recursive: true });
  } catch {
    // Already deleted or doesn't exist
  }
}

export async function deleteAllRepos(): Promise<void> {
  try {
    const ppRoot = await getPrivatePagesRoot();
    await ppRoot.removeEntry(REPOS_DIR, { recursive: true });
  } catch {
    // Already empty
  }
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const estimate = await navigator.storage.estimate();
  return {
    usedBytes: estimate.usage ?? 0,
    quotaBytes: estimate.quota ?? 0,
    persistent: await navigator.storage.persisted(),
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  return navigator.storage.persist();
}
