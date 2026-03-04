import { GitClient } from '../git/client';
import { getMimeType } from './resolver';
import type { ContentFetcher, ResolvedFile } from './types';

/**
 * Primary content source: reads files from the local OPFS git clone.
 */
export class GitContentFetcher implements ContentFetcher {
  private clients = new Map<string, GitClient>();
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
    const client = this.getClient(owner, repo, branch);
    const content = await client.readFile(path);
    if (!content) return null;

    return {
      path,
      content,
      blobSha: '', // TODO: compute from git blob
      contentType: getMimeType(path),
      size: content.byteLength,
    };
  }

  private getClient(owner: string, repo: string, branch: string): GitClient {
    const key = `${owner}/${repo}/${branch}`;
    let client = this.clients.get(key);
    if (!client) {
      client = new GitClient({
        owner,
        repo,
        branch,
        token: this.token,
      });
      this.clients.set(key, client);
    }
    return client;
  }
}
