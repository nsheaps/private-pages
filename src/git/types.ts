export interface RepoState {
  owner: string;
  repo: string;
  branch: string;
  lastFetchAt: number;
  headCommitSha: string;
  totalSizeBytes: number;
  cloneComplete: boolean;
}

export interface CloneProgress {
  phase: string;
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

export interface GitClientOptions {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  onProgress?: (progress: CloneProgress) => void;
}
