/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = '0.1.0';

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/__pages__/')) {
    event.respondWith(
      new Response('Service Worker not yet implemented', { status: 501 }),
    );
    return;
  }
});

export { SW_VERSION };
