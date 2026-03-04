import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { createOpfsFs, type OpfsFs } from './opfs-fs';
import { createAuthHelper } from './auth-helper';
import { getRepoDir } from '../storage/opfs';
import { getRepoMetadata, setRepoMetadata } from '../storage/idb';
import type { CloneProgress, RepoState } from './types';

const LOCK_PREFIX = 'private-pages-repo';

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
    return this.withLock(async () => {
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
  }

  async fetch(): Promise<RepoState> {
    return this.withLock(async () => {
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
