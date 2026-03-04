export interface ResolvedFile {
  path: string;
  content: Uint8Array;
  blobSha: string;
  contentType: string;
  size: number;
}

export interface ContentFetcher {
  getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<ResolvedFile | null>;
}

export interface ContentResult {
  file: ResolvedFile | null;
  source: 'git' | 'api';
}
