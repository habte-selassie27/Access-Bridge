// PasteWise service worker.
// Caches the app shell so demo mode works offline on repeat visits.
// Static assets (fonts, demo audio) are served cache-first; /api calls go to
// the network and are not cached.
const CACHE = "pastewise-shell-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // App shell + static assets: cache-first.
  if (event.request.method === "GET" && (SHELL.includes(url.pathname) || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/audio/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/fonts/"))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return resp;
      }))
    );
    return;
  }

  // API and everything else: network-first, no caching.
  event.respondWith(fetch(event.request));
});
