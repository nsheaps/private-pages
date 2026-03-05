/**
 * Path resolver: maps URL paths to file paths in the repo.
 *
 * Resolution order for path "/docs/guide":
 * 1. /docs/guide (exact match)
 * 2. /docs/guide/index.html
 * 3. /docs/guide.html
 *
 * For root "/":
 * 1. /index.html
 */

import type { ContentFetcher, ResolvedFile } from './types';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

export function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function hasFileExtension(path: string): boolean {
  const lastSegment = path.split('/').pop() ?? '';
  return lastSegment.includes('.') && !lastSegment.startsWith('.');
}

export function getResolutionCandidates(
  urlPath: string,
  directory: string,
): string[] {
  // Normalize directory to not have trailing slash
  const dir = directory.replace(/\/$/, '');
  // Normalize URL path
  const cleanPath = urlPath.replace(/^\/|\/$/g, '');

  const basePath = dir ? `${dir}/${cleanPath}` : cleanPath;

  // If path already has a file extension, try it directly
  if (hasFileExtension(basePath)) {
    return [basePath];
  }

  // Empty path = root
  if (!cleanPath) {
    return dir ? [`${dir}/index.html`] : ['index.html'];
  }

  return [basePath, `${basePath}/index.html`, `${basePath}.html`];
}

export async function resolveFile(
  fetcher: ContentFetcher,
  owner: string,
  repo: string,
  branch: string,
  urlPath: string,
  directory: string,
): Promise<ResolvedFile | null> {
  const candidates = getResolutionCandidates(urlPath, directory);

  for (const candidate of candidates) {
    const file = await fetcher.getFile(owner, repo, branch, candidate);
    if (file) return file;
  }

  return null;
}

export async function resolve404(
  fetcher: ContentFetcher,
  owner: string,
  repo: string,
  branch: string,
  directory: string,
): Promise<ResolvedFile | null> {
  const dir = directory.replace(/\/$/, '');
  const path404 = dir ? `${dir}/404.html` : '404.html';
  return fetcher.getFile(owner, repo, branch, path404);
}
