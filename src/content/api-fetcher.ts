import { getMimeType } from './resolver';
import type { ContentFetcher, ResolvedFile } from './types';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Fallback content source: reads files via the GitHub Contents API.
 * Used when the git clone hasn't completed or git operations fail.
 */
export class GitHubApiFetcher implements ContentFetcher {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<ResolvedFile | null> {
    try {
      const cleanPath = path.replace(/^\//, '');
      const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${cleanPath}?ref=${branch}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      });

      if (!response.ok) return null;

      const content = new Uint8Array(await response.arrayBuffer());
      return {
        path: cleanPath,
        content,
        blobSha: response.headers.get('etag')?.replace(/"/g, '') ?? '',
        contentType: getMimeType(cleanPath),
        size: content.byteLength,
      };
    } catch {
      return null;
    }
  }
}
