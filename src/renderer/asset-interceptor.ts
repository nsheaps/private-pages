import type { ContentFetcher } from '../content/types';
import { getMimeType } from '../content/resolver';

/**
 * Rewrites relative asset URLs in HTML to blob URLs.
 * Used in srcdoc fallback mode (when SW is not available).
 */
export async function rewriteAssetUrls(
  html: string,
  fetcher: ContentFetcher,
  owner: string,
  repo: string,
  branch: string,
  directory: string,
  currentPath: string,
): Promise<string> {
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  const blobUrls: string[] = [];

  // Match src="...", href="...", url(...) for relative paths
  const urlPattern = /((?:src|href|action|poster)\s*=\s*")([^"]+)(")/gi;

  const matches: Array<{ full: string; prefix: string; url: string; suffix: string }> = [];

  let match;
  while ((match = urlPattern.exec(html)) !== null) {
    const url = match[2];
    if (!url) continue;
    // Skip absolute URLs, data URIs, anchors
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('//') ||
      url.startsWith('data:') ||
      url.startsWith('#') ||
      url.startsWith('javascript:')
    ) {
      continue;
    }
    matches.push({
      full: match[0],
      prefix: match[1]!,
      url,
      suffix: match[3]!,
    });
  }

  let result = html;
  for (const m of matches) {
    const resolvedPath = m.url.startsWith('/')
      ? `${directory.replace(/\/$/, '')}${m.url}`
      : `${directory.replace(/\/$/, '')}/${currentDir}${m.url}`.replace(
          /\/+/g,
          '/',
        );

    const file = await fetcher.getFile(owner, repo, branch, resolvedPath);
    if (file) {
      const buf = new ArrayBuffer(file.content.byteLength);
      new Uint8Array(buf).set(file.content);
      const blob = new Blob([buf], {
        type: getMimeType(resolvedPath),
      });
      const blobUrl = URL.createObjectURL(blob);
      blobUrls.push(blobUrl);
      result = result.replace(m.full, `${m.prefix}${blobUrl}${m.suffix}`);
    }
  }

  // Store blob URLs for cleanup
  (globalThis as Record<string, unknown>).__ppBlobUrls = blobUrls;

  return result;
}

export function cleanupBlobUrls(): void {
  const urls = (globalThis as Record<string, unknown>).__ppBlobUrls as
    | string[]
    | undefined;
  if (urls) {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
    delete (globalThis as Record<string, unknown>).__ppBlobUrls;
  }
}
