export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  persistent: boolean;
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  branch: string;
  lastFetchAt: number;
  headCommitSha: string;
  totalSizeBytes: number;
  cloneComplete: boolean;
}
