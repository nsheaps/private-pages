/// <reference lib="webworker" />

/**
 * Read files from OPFS in the Service Worker context.
 */

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
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export async function serveFromOpfs(
  owner: string,
  repo: string,
  filePath: string,
): Promise<Response> {
  try {
    const root = await navigator.storage.getDirectory();
    const ppRoot = await root.getDirectoryHandle('private-pages');
    const reposDir = await ppRoot.getDirectoryHandle('repos');
    const ownerDir = await reposDir.getDirectoryHandle(owner);
    const repoDir = await ownerDir.getDirectoryHandle(`${repo}.git`);

    // Navigate the OPFS directory structure to find the file
    // For a bare git clone, we need to read from the git objects
    // This is a simplified approach that works with the worktree
    const parts = filePath.split('/').filter(Boolean);
    let dir: FileSystemDirectoryHandle = repoDir;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;
      dir = await dir.getDirectoryHandle(part);
    }

    const fileName = parts[parts.length - 1] ?? 'index.html';
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.arrayBuffer();

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': getMimeType(filePath),
        'Content-Length': String(content.byteLength),
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return new Response('File not found in OPFS', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
