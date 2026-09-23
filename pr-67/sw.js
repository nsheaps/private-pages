//#region src/sw/sw-router.ts
var e = "/__pages__/";
function t(t) {
	if (!t.startsWith(e)) return null;
	let n = t.slice(11).split("/"), r = n[0], i = n[1], a = n[2];
	return !r || !i || !a ? null : {
		owner: r,
		repo: i,
		branch: a,
		filePath: n.slice(3).join("/") || "index.html"
	};
}
function n(t) {
	return t.startsWith(e);
}
//#endregion
//#region src/sw/sw-opfs.ts
var r = {
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
function i(e) {
	return r[e.slice(e.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream";
}
async function a(e, t, n) {
	try {
		let r = await (await (await (await (await navigator.storage.getDirectory()).getDirectoryHandle("private-pages")).getDirectoryHandle("repos")).getDirectoryHandle(e)).getDirectoryHandle(`${t}.git`), a = n.split("/").filter(Boolean), o = r;
		for (let e = 0; e < a.length - 1; e++) {
			let t = a[e];
			t && (o = await o.getDirectoryHandle(t));
		}
		let s = a[a.length - 1] ?? "index.html", c = await (await (await o.getFileHandle(s)).getFile()).arrayBuffer();
		return new Response(c, {
			status: 200,
			headers: {
				"Content-Type": i(n),
				"Content-Length": String(c.byteLength),
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
//#endregion
//#region src/sw/sw.ts
var o = "0.1.0";
self.addEventListener("install", () => {
	self.skipWaiting();
}), self.addEventListener("activate", (e) => {
	e.waitUntil(self.clients.claim());
}), self.addEventListener("fetch", (e) => {
	let t = new URL(e.request.url);
	if (n(t.pathname)) {
		e.respondWith(s(t.pathname));
		return;
	}
});
async function s(e) {
	let n = t(e);
	if (!n) return new Response("Invalid page route", { status: 400 });
	let r = await a(n.owner, n.repo, n.filePath);
	if (r.status === 404 && !n.filePath.includes(".")) {
		let e = await a(n.owner, n.repo, `${n.filePath}/index.html`);
		if (e.ok) return e;
	}
	return r;
}
self.addEventListener("message", (e) => {
	e.data;
});
//#endregion
export { o as SW_VERSION };

//# sourceMappingURL=sw.js.map