import { describe, it, expect, vi } from 'vitest';
import { FallbackContentFetcher } from './fetcher';
import type { ContentFetcher, ResolvedFile } from './types';

describe('FallbackContentFetcher', () => {
  const mockFile: ResolvedFile = {
    path: 'index.html',
    content: new Uint8Array([60, 104, 49, 62]),
    blobSha: 'abc123',
    contentType: 'text/html',
    size: 4,
  };

  it('returns file from primary when available', async () => {
    const primary: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(mockFile),
    };
    const fallback: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };

    const fetcher = new FallbackContentFetcher(primary, fallback);
    const result = await fetcher.getFile('org', 'repo', 'main', 'index.html');

    expect(result).toEqual(mockFile);
    expect(fallback.getFile).not.toHaveBeenCalled();
  });

  it('falls back to secondary when primary returns null', async () => {
    const primary: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };
    const apiFile = { ...mockFile, blobSha: 'api-sha' };
    const fallback: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(apiFile),
    };

    const fetcher = new FallbackContentFetcher(primary, fallback);
    const result = await fetcher.getFile('org', 'repo', 'main', 'index.html');

    expect(result).toEqual(apiFile);
  });

  it('returns null when both return null', async () => {
    const primary: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };
    const fallback: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };

    const fetcher = new FallbackContentFetcher(primary, fallback);
    const result = await fetcher.getFile('org', 'repo', 'main', 'missing.html');

    expect(result).toBeNull();
  });

  it('getFileWithSource reports correct source', async () => {
    const primary: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(null),
    };
    const fallback: ContentFetcher = {
      getFile: vi.fn().mockResolvedValue(mockFile),
    };

    const fetcher = new FallbackContentFetcher(primary, fallback);
    const result = await fetcher.getFileWithSource('org', 'repo', 'main', 'index.html');

    expect(result.source).toBe('api');
    expect(result.file).toEqual(mockFile);
  });
});
