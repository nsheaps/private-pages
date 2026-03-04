const s = "0.1.0";
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (e) => {
  if (new URL(e.request.url).pathname.startsWith("/__pages__/")) {
    e.respondWith(
      new Response("Service Worker not yet implemented", { status: 501 })
    );
    return;
  }
});
export {
  s as SW_VERSION
};
//# sourceMappingURL=sw.js.map
