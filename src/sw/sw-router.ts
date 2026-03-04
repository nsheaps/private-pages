/// <reference lib="webworker" />

/**
 * SW route matching: parses /__pages__/<owner>/<repo>/<branch>/<path> URLs.
 */
export interface ParsedPageRoute {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}

const PAGES_PREFIX = '/__pages__/';

export function parsePageRoute(pathname: string): ParsedPageRoute | null {
  if (!pathname.startsWith(PAGES_PREFIX)) return null;

  const rest = pathname.slice(PAGES_PREFIX.length);
  const parts = rest.split('/');

  const owner = parts[0];
  const repo = parts[1];
  const branch = parts[2];

  if (!owner || !repo || !branch) return null;

  const filePath = parts.slice(3).join('/') || 'index.html';
  return { owner, repo, branch, filePath };
}

export function isPageRequest(pathname: string): boolean {
  return pathname.startsWith(PAGES_PREFIX);
}
