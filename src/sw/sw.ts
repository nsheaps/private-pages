/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { isPageRequest, parsePageRoute } from './sw-router';
import { serveFromOpfs } from './sw-opfs';
import type { ClientToSwMessage, SwToClientMessage } from './sw-types';

const SW_VERSION = '0.1.0';

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (isPageRequest(url.pathname)) {
    event.respondWith(handlePageRequest(url.pathname));
    return;
  }
});

async function handlePageRequest(pathname: string): Promise<Response> {
  const route = parsePageRoute(pathname);
  if (!route) {
    return new Response('Invalid page route', { status: 400 });
  }

  const response = await serveFromOpfs(route.owner, route.repo, route.filePath);

  // If not found, try index.html for SPA routing
  if (response.status === 404 && !route.filePath.includes('.')) {
    const indexResponse = await serveFromOpfs(
      route.owner,
      route.repo,
      `${route.filePath}/index.html`,
    );
    if (indexResponse.ok) return indexResponse;
  }

  return response;
}

self.addEventListener('message', (event) => {
  // REPO_CLONED, FETCH_COMPLETE, CONFIG_UPDATE:
  // No cache invalidation needed — we read from OPFS on each request.
  void (event.data as ClientToSwMessage);
});

function notifyClients(message: SwToClientMessage): void {
  void self.clients.matchAll().then((clients) => {
    for (const client of clients) {
      client.postMessage(message);
    }
  });
}

// Suppress unused export warning — notifyClients will be used by background sync
void notifyClients;

export { SW_VERSION };
