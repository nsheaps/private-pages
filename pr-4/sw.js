const c = "/__pages__/";
function m(t) {
  if (!t.startsWith(c)) return null;
  const n = t.slice(c.length).split("/"), i = n[0], o = n[1], s = n[2];
  if (!i || !o || !s) return null;
  const p = n.slice(3).join("/") || "index.html";
  return { owner: i, repo: o, branch: s, filePath: p };
}
function h(t) {
  return t.startsWith(c);
}
const x = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain",
  ".wasm": "application/wasm"
};
function v(t) {
  const e = t.slice(t.lastIndexOf(".")).toLowerCase();
  return x[e] ?? "application/octet-stream";
}
async function u(t, e, n) {
  try {
    const d = await (await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle("private-pages")).getDirectoryHandle("repos")).getDirectoryHandle(t)).getDirectoryHandle(`${e}.git`), a = n.split("/").filter(Boolean);
    let r = d;
    for (let l = 0; l < a.length - 1; l++) {
      const g = a[l];
      g && (r = await r.getDirectoryHandle(g));
    }
    const w = a[a.length - 1] ?? "index.html", f = await (await (await r.getFileHandle(w)).getFile()).arrayBuffer();
    return new Response(f, {
      status: 200,
      headers: {
        "Content-Type": v(n),
        "Content-Length": String(f.byteLength),
        "Cache-Control": "no-cache"
      }
    });
  } catch {
    return new Response("File not found in OPFS", {
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
const D = "0.1.0";
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (t) => {
  const e = new URL(t.request.url);
  if (h(e.pathname)) {
    t.respondWith(y(e.pathname));
    return;
  }
});
async function y(t) {
  const e = m(t);
  if (!e)
    return new Response("Invalid page route", { status: 400 });
  const n = await u(e.owner, e.repo, e.filePath);
  if (n.status === 404 && !e.filePath.includes(".")) {
    const i = await u(
      e.owner,
      e.repo,
      `${e.filePath}/index.html`
    );
    if (i.ok) return i;
  }
  return n;
}
self.addEventListener("message", (t) => {
  t.data;
});
export {
  D as SW_VERSION
};
//# sourceMappingURL=sw.js.map
