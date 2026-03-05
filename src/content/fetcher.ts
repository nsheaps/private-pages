import type { ContentFetcher, ContentResult, ResolvedFile } from './types';

/**
 * Tries the local git clone first, falls back to GitHub API.
 */
export class FallbackContentFetcher implements ContentFetcher {
  private primary: ContentFetcher;
  private fallback: ContentFetcher;

  constructor(primary: ContentFetcher, fallback: ContentFetcher) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<ResolvedFile | null> {
    const result = await this.getFileWithSource(owner, repo, branch, path);
    return result.file;
  }

  async getFileWithSource(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<ContentResult> {
    const primaryResult = await this.primary.getFile(owner, repo, branch, path);
    if (primaryResult) {
      return { file: primaryResult, source: 'git' };
    }

    const fallbackResult = await this.fallback.getFile(owner, repo, branch, path);
    return { file: fallbackResult, source: 'api' };
  }
}
