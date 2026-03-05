/**
 * OPFS adapter implementing the isomorphic-git `fs` interface.
 *
 * isomorphic-git requires a subset of Node's `fs` module with callback-based
 * APIs. This adapter maps OPFS (FileSystemDirectoryHandle) to that interface.
 *
 * All paths are relative to a root OPFS directory handle.
 */

// FileSystemDirectoryHandle is async-iterable in browsers but TS DOM types
// don't include the async iterator protocol.
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
}

type Callback<T = void> = (err: Error | null, result?: T) => void;

interface Stats {
  type: 'file' | 'dir';
  mode: number;
  size: number;
  ino: number;
  mtimeMs: number;
  ctimeMs: number;
  uid: 1;
  gid: 1;
  dev: 1;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

function createStats(type: 'file' | 'dir', size: number): Stats {
  const now = Date.now();
  return {
    type,
    mode: type === 'file' ? 0o100644 : 0o40755,
    size,
    ino: 0,
    mtimeMs: now,
    ctimeMs: now,
    uid: 1,
    gid: 1,
    dev: 1,
    isFile: () => type === 'file',
    isDirectory: () => type === 'dir',
    isSymbolicLink: () => false,
  };
}

function splitPath(filepath: string): string[] {
  return filepath.split('/').filter(Boolean);
}

async function getParentDir(
  root: FileSystemDirectoryHandle,
  filepath: string,
  create = false,
): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
  const parts = splitPath(filepath);
  const name = parts.pop();
  if (!name) throw new Error(`Invalid path: ${filepath}`);

  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return { parent: dir, name };
}

export function createOpfsFs(root: FileSystemDirectoryHandle) {
  return {
    readFile(
      filepath: string,
      optionsOrCallback: { encoding?: string } | Callback<Uint8Array | string>,
      maybeCallback?: Callback<Uint8Array | string>,
    ): void {
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
      const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;

      (async () => {
        const { parent, name } = await getParentDir(root, filepath);
        const fileHandle = await parent.getFileHandle(name);
        const file = await fileHandle.getFile();
        if (options.encoding === 'utf8') {
          return await file.text();
        }
        return new Uint8Array(await file.arrayBuffer());
      })().then(
        (result) => cb(null, result),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    writeFile(
      filepath: string,
      data: Uint8Array | string,
      optionsOrCallback: { encoding?: string; mode?: number } | Callback,
      maybeCallback?: Callback,
    ): void {
      const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;

      (async () => {
        const { parent, name } = await getParentDir(root, filepath, true);
        const fileHandle = await parent.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        if (typeof data === 'string') {
          await writable.write(data);
        } else {
          // Copy to a plain ArrayBuffer to satisfy FileSystemWriteChunkType
          const buf = new ArrayBuffer(data.byteLength);
          new Uint8Array(buf).set(data);
          await writable.write(buf);
        }
        await writable.close();
      })().then(
        () => cb(null),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    unlink(filepath: string, cb: Callback): void {
      (async () => {
        const { parent, name } = await getParentDir(root, filepath);
        await parent.removeEntry(name);
      })().then(
        () => cb(null),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    readdir(filepath: string, cb: Callback<string[]>): void {
      (async () => {
        let dir = root;
        const parts = splitPath(filepath);
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        const entries: string[] = [];
        for await (const [name] of dir.entries()) {
          entries.push(name);
        }
        return entries;
      })().then(
        (result) => cb(null, result),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    mkdir(filepath: string, optionsOrCallback: { mode?: number } | Callback, maybeCallback?: Callback): void {
      const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;

      (async () => {
        const { parent, name } = await getParentDir(root, filepath, true);
        await parent.getDirectoryHandle(name, { create: true });
      })().then(
        () => cb(null),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    rmdir(filepath: string, cb: Callback): void {
      (async () => {
        const { parent, name } = await getParentDir(root, filepath);
        await parent.removeEntry(name, { recursive: true });
      })().then(
        () => cb(null),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    stat(filepath: string, cb: Callback<Stats>): void {
      (async () => {
        if (filepath === '/' || filepath === '' || filepath === '.') {
          return createStats('dir', 0);
        }
        const { parent, name } = await getParentDir(root, filepath);
        try {
          const fileHandle = await parent.getFileHandle(name);
          const file = await fileHandle.getFile();
          return createStats('file', file.size);
        } catch {
          // Not a file, try as directory
          await parent.getDirectoryHandle(name);
          return createStats('dir', 0);
        }
      })().then(
        (result) => cb(null, result),
        (err: unknown) => cb(err instanceof Error ? err : new Error(String(err))),
      );
    },

    lstat(filepath: string, cb: Callback<Stats>): void {
      // OPFS doesn't have symlinks, so lstat === stat
      this.stat(filepath, cb);
    },

    symlink(_target: string, _filepath: string, cb: Callback): void {
      // OPFS doesn't support symlinks
      cb(null);
    },

    readlink(_filepath: string, cb: Callback<string>): void {
      cb(new Error('OPFS does not support symlinks'));
    },
  };
}

export type OpfsFs = ReturnType<typeof createOpfsFs>;
