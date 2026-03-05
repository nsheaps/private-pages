import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { createOpfsFs, type OpfsFs } from './opfs-fs';
import { createAuthHelper } from './auth-helper';
import { getRepoDir } from '../storage/opfs';
import { getRepoMetadata, setRepoMetadata } from '../storage/idb';
import type { CloneProgress, RepoState } from './types';

const LOCK_PREFIX = 'private-pages-repo';

/**
 * isomorphic-git error shape — errors have a string `code` and a `data` bag.
 */
interface IsomorphicGitError extends Error {
  code?: string;
  data?: {
    statusCode?: number;
    statusMessage?: string;
    response?: string;
  };
}

function isGitError(err: unknown): err is IsomorphicGitError {
  return err instanceof Error && typeof (err as IsomorphicGitError).code === 'string';
}

/**
 * Turn a raw error from isomorphic-git / fetch into a user-friendly message
 * that includes enough detail so the user doesn't need to open DevTools.
 */
function friendlyCloneError(err: unknown, owner: string, repo: string): Error {
  // isomorphic-git HTTP errors (401, 403, 404, 5xx …)
  if (isGitError(err) && err.code === 'HttpError' && err.data?.statusCode) {
    const { statusCode, statusMessage } = err.data;
    switch (statusCode) {
      case 401:
        return new Error(
          `Authentication failed for ${owner}/${repo} (HTTP 401). ` +
            'Your token may be invalid or expired — try signing out and back in.',
        );
      case 403:
        return new Error(
          `Access denied to ${owner}/${repo} (HTTP 403). ` +
            'Your token may lack the required scopes, or the repository may restrict access.',
        );
      case 404:
        return new Error(
          `Repository ${owner}/${repo} was not found (HTTP 404). ` +
            'Check that the repository exists and that your token has access to it.',
        );
      default:
        return new Error(
          `Could not clone ${owner}/${repo}: the server responded with HTTP ${statusCode} ${statusMessage ?? ''}.`.trim(),
        );
    }
  }

  // isomorphic-git SmartHttpError — usually means the response wasn't valid git smart-HTTP
  if (isGitError(err) && err.code === 'SmartHttpError') {
    return new Error(
      `Could not clone ${owner}/${repo}: the server returned an unexpected response. ` +
        'This can happen if the URL is wrong or a proxy is interfering with the request.',
    );
  }

  // Browser-level network failure ("Failed to fetch", CORS, offline, etc.)
  if (
    err instanceof TypeError &&
    /fetch|network|cors/i.test(err.message)
  ) {
    return new Error(
      `Network error while cloning ${owner}/${repo}: ${err.message}. ` +
        'Check your internet connection and ensure nothing is blocking requests to github.com.',
    );
  }

  // Fallback — preserve the original message
  if (err instanceof Error) {
    return new Error(`Could not clone ${owner}/${repo}: ${err.message}`);
  }

  return new Error(`Could not clone ${owner}/${repo}: an unknown error occurred.`);
}

export class GitClient {
  private owner: string;
  private repo: string;
  private branch: string;
  private token: string;
  private onProgress?: (progress: CloneProgress) => void;
  private fs: OpfsFs | null = null;
  private dir = '/';

  constructor(options: {
    owner: string;
    repo: string;
    branch: string;
    token: string;
    onProgress?: (progress: CloneProgress) => void;
  }) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.branch = options.branch;
    this.token = options.token;
    this.onProgress = options.onProgress;
  }

  private get url(): string {
    return `https://github.com/${this.owner}/${this.repo}.git`;
  }

  private get lockName(): string {
    return `${LOCK_PREFIX}-${this.owner}-${this.repo}`;
  }

  private async ensureFs(): Promise<OpfsFs> {
    if (!this.fs) {
      const dirHandle = await getRepoDir(this.owner, this.repo);
      this.fs = createOpfsFs(dirHandle);
    }
    return this.fs;
  }

  async clone(): Promise<RepoState> {
    try {
      return await this.withLock(async () => {
        const fs = await this.ensureFs();
        const { onAuth } = createAuthHelper(this.token);

        await git.clone({
          fs,
          http,
          dir: this.dir,
          url: this.url,
          ref: this.branch,
          singleBranch: true,
          depth: 1,
          noCheckout: true,
          onAuth,
          onProgress: this.onProgress
            ? (event) => {
                this.onProgress!({
                  phase: event.phase,
                  loaded: event.loaded,
                  total: event.total,
                  lengthComputable: event.total > 0,
                });
              }
            : undefined,
        });

        const headSha = await git.resolveRef({
          fs,
          dir: this.dir,
          ref: this.branch,
        });

        const state: RepoState = {
          owner: this.owner,
          repo: this.repo,
          branch: this.branch,
          lastFetchAt: Date.now(),
          headCommitSha: headSha,
          totalSizeBytes: 0,
          cloneComplete: true,
        };

        await setRepoMetadata({
          ...state,
        });

        return state;
      });
    } catch (err) {
      throw friendlyCloneError(err, this.owner, this.repo);
    }
  }

  async fetch(): Promise<RepoState> {
    try {
      return await this.withLock(async () => {
        const fs = await this.ensureFs();
        const { onAuth } = createAuthHelper(this.token);

        await git.fetch({
          fs,
          http,
          dir: this.dir,
          url: this.url,
          ref: this.branch,
          singleBranch: true,
          onAuth,
          onProgress: this.onProgress
            ? (event) => {
                this.onProgress!({
                  phase: event.phase,
                  loaded: event.loaded,
                  total: event.total,
                  lengthComputable: event.total > 0,
                });
              }
            : undefined,
        });

        const headSha = await git.resolveRef({
          fs,
          dir: this.dir,
          ref: this.branch,
        });

        const state: RepoState = {
          owner: this.owner,
          repo: this.repo,
          branch: this.branch,
          lastFetchAt: Date.now(),
          headCommitSha: headSha,
          totalSizeBytes: 0,
          cloneComplete: true,
        };

        await setRepoMetadata({ ...state });
        return state;
      });
    } catch (err) {
      throw friendlyCloneError(err, this.owner, this.repo);
    }
  }

  async cloneOrFetch(ttlSeconds: number): Promise<RepoState> {
    const metadata = await getRepoMetadata(this.owner, this.repo);

    if (!metadata?.cloneComplete) {
      return this.clone();
    }

    const age = (Date.now() - metadata.lastFetchAt) / 1000;
    if (age < ttlSeconds) {
      return {
        owner: metadata.owner,
        repo: metadata.repo,
        branch: metadata.branch,
        lastFetchAt: metadata.lastFetchAt,
        headCommitSha: metadata.headCommitSha,
        totalSizeBytes: metadata.totalSizeBytes,
        cloneComplete: metadata.cloneComplete,
      };
    }

    return this.fetch();
  }

  async readFile(path: string): Promise<Uint8Array | null> {
    const fs = await this.ensureFs();

    try {
      const headSha = await git.resolveRef({
        fs,
        dir: this.dir,
        ref: this.branch,
      });

      const { blob } = await git.readBlob({
        fs,
        dir: this.dir,
        oid: headSha,
        filepath: path.startsWith('/') ? path.slice(1) : path,
      });

      return blob;
    } catch {
      return null;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const fs = await this.ensureFs();

    try {
      const headSha = await git.resolveRef({
        fs,
        dir: this.dir,
        ref: this.branch,
      });

      const commit = await git.readCommit({
        fs,
        dir: this.dir,
        oid: headSha,
      });

      const normalizedPath = dirPath.replace(/^\/|\/$/g, '');
      const tree = await git.readTree({
        fs,
        dir: this.dir,
        oid: commit.commit.tree,
        filepath: normalizedPath || undefined,
      });

      return tree.tree.map((entry) => entry.path);
    } catch {
      return [];
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      return navigator.locks.request(this.lockName, fn);
    }
    // Fallback for environments without Web Locks
    return fn();
  }
}
