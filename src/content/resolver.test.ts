import { describe, it, expect, vi } from 'vitest';
import {
  getResolutionCandidates,
  getMimeType,
  resolveFile,
  resolve404,
} from './resolver';
import type { ContentFetcher, ResolvedFile } from './types';

describe('getMimeType', () => {
  it('returns correct MIME types', () => {
    expect(getMimeType('style.css')).toBe('text/css');
    expect(getMimeType('app.js')).toBe('application/javascript');
    expect(getMimeType('index.html')).toBe('text/html');
    expect(getMimeType('logo.png')).toBe('image/png');
    expect(getMimeType('data.json')).toBe('application/json');
    expect(getMimeType('image.svg')).toBe('image/svg+xml');
  });

  it('returns octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('is case insensitive', () => {
    expect(getMimeType('style.CSS')).toBe('text/css');
  });
});

describe('getResolutionCandidates', () => {
  it('resolves root path', () => {
    expect(getResolutionCandidates('/', '')).toEqual(['index.html']);
  });

  it('resolves root path with directory', () => {
    expect(getResolutionCandidates('/', 'build')).toEqual([
      'build/index.html',
    ]);
  });

  it('resolves path without extension', () => {
    expect(getResolutionCandidates('/docs/guide', '')).toEqual([
      'docs/guide',
      'docs/guide/index.html',
      'docs/guide.html',
    ]);
  });

  it('resolves path with directory prefix', () => {
    expect(getResolutionCandidates('/guide', 'build/')).toEqual([
      'build/guide',
      'build/guide/index.html',
      'build/guide.html',
    ]);
  });

  it('resolves path with extension directly', () => {
    expect(getResolutionCandidates('/style.css', '')).toEqual(['style.css']);
  });

  it('handles trailing slashes', () => {
    expect(getResolutionCandidates('/docs/', '')).toEqual([
      'docs',
      'docs/index.html',
      'docs.html',
    ]);
  });
});

describe('resolveFile', () => {
  const mockFile: ResolvedFile = {
    path: 'docs/guide/index.html',
    content: new Uint8Array([60, 104, 49, 62]),
    blobSha: 'abc123',
    contentType: 'text/html',
    size: 4,
  };

  it('returns file from first matching candidate', async () => {
    const fetcher: ContentFetcher = {
      getFile: vi.fn()
        .mockResolvedValueOnce(null)      // docs/guide
        .mockResolvedValueOnce(mockFile),  // docs/guide/index.html
    };

    const result = await resolveFile(fetcher, 'org', 'repo', 'main', '/docs/guide', '');
    expect(result).toEqual(mockFile);
    expect(fetcher.getFile).toHaveBeenCalledTimes(2);
  });

  it('returns null when no candidate matches', async () => {
    const fetcher: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };

    const result = await resolveFile(fetcher, 'org', 'repo', 'main', '/missing', '');
    expect(result).toBeNull();
  });
});

describe('resolve404', () => {
  it('looks for 404.html in directory', async () => {
    const fetcher: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };

    await resolve404(fetcher, 'org', 'repo', 'main', 'build/');
    expect(fetcher.getFile).toHaveBeenCalledWith('org', 'repo', 'main', 'build/404.html');
  });

  it('looks for 404.html at root when no directory', async () => {
    const fetcher: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };

    await resolve404(fetcher, 'org', 'repo', 'main', '');
    expect(fetcher.getFile).toHaveBeenCalledWith('org', 'repo', 'main', '404.html');
  });
});
