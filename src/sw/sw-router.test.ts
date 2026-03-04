import { describe, it, expect } from 'vitest';
import { parsePageRoute, isPageRequest } from './sw-router';

describe('isPageRequest', () => {
  it('returns true for /__pages__/ URLs', () => {
    expect(isPageRequest('/__pages__/org/repo/main/index.html')).toBe(true);
    expect(isPageRequest('/__pages__/org/repo/main/')).toBe(true);
  });

  it('returns false for other URLs', () => {
    expect(isPageRequest('/index.html')).toBe(false);
    expect(isPageRequest('/api/data')).toBe(false);
    expect(isPageRequest('/')).toBe(false);
  });
});

describe('parsePageRoute', () => {
  it('parses a full page route', () => {
    const result = parsePageRoute('/__pages__/myorg/myrepo/main/docs/guide.html');
    expect(result).toEqual({
      owner: 'myorg',
      repo: 'myrepo',
      branch: 'main',
      filePath: 'docs/guide.html',
    });
  });

  it('defaults to index.html when no file path', () => {
    const result = parsePageRoute('/__pages__/org/repo/main/');
    expect(result).toEqual({
      owner: 'org',
      repo: 'repo',
      branch: 'main',
      filePath: 'index.html',
    });
  });

  it('handles root path without trailing slash', () => {
    const result = parsePageRoute('/__pages__/org/repo/main');
    expect(result).toEqual({
      owner: 'org',
      repo: 'repo',
      branch: 'main',
      filePath: 'index.html',
    });
  });

  it('returns null for invalid routes', () => {
    expect(parsePageRoute('/__pages__/')).toBeNull();
    expect(parsePageRoute('/__pages__/org')).toBeNull();
    expect(parsePageRoute('/__pages__/org/repo')).toBeNull();
    expect(parsePageRoute('/other/path')).toBeNull();
  });

  it('handles nested file paths', () => {
    const result = parsePageRoute('/__pages__/org/repo/main/assets/css/style.css');
    expect(result).toEqual({
      owner: 'org',
      repo: 'repo',
      branch: 'main',
      filePath: 'assets/css/style.css',
    });
  });
});
