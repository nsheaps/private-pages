import { GitClient } from './client';
import { getAllRepoMetadata } from '../storage/idb';
import type { RepoState } from './types';

export interface SyncResult {
  owner: string;
  repo: string;
  updated: boolean;
  newSha?: string;
  error?: string;
}

/**
 * Check all cloned repos for updates and fetch if stale.
 */
export async function syncAllRepos(
  token: string,
  ttlSeconds: number,
): Promise<SyncResult[]> {
  const repos = await getAllRepoMetadata();
  const results: SyncResult[] = [];

  for (const meta of repos) {
    if (!meta.cloneComplete) continue;

    const age = (Date.now() - meta.lastFetchAt) / 1000;
    if (age < ttlSeconds) {
      results.push({ owner: meta.owner, repo: meta.repo, updated: false });
      continue;
    }

    try {
      const client = new GitClient({
        owner: meta.owner,
        repo: meta.repo,
        branch: meta.branch,
        token,
      });

      const state: RepoState = await client.fetch();
      const updated = state.headCommitSha !== meta.headCommitSha;
      results.push({
        owner: meta.owner,
        repo: meta.repo,
        updated,
        newSha: updated ? state.headCommitSha : undefined,
      });
    } catch (err: unknown) {
      results.push({
        owner: meta.owner,
        repo: meta.repo,
        updated: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  }

  return results;
}

/**
 * Set up periodic sync with a configurable interval.
 */
export function startPeriodicSync(
  token: string,
  intervalMs: number,
  ttlSeconds: number,
  onUpdate?: (results: SyncResult[]) => void,
): () => void {
  const id = window.setInterval(() => {
    syncAllRepos(token, ttlSeconds)
      .then((results) => {
        const hasUpdates = results.some((r) => r.updated);
        if (hasUpdates) {
          onUpdate?.(results);
        }
      })
      .catch(() => {
        // Silently fail on background sync errors
      });
  }, intervalMs);

  return () => window.clearInterval(id);
}
