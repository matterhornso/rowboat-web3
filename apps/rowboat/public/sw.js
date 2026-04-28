// Autonomous Memory — service worker
// Strategy: network-first for navigations and API, cache-first for static assets.
// Keep this tiny. Don't cache POST/PUT/DELETE, don't cache auth-gated HTML.

const VERSION = "v1";
const STATIC_CACHE = `am-static-${VERSION}`;
const RUNTIME_CACHE = `am-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/logo-only.png",
  "/logo.png",
  "/mascot.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Ignore precache failures — SW still useful for runtime caching.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Skip non-GET entirely
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin and extensions
  if (url.origin !== self.location.origin) return;

  // Never cache API, auth, or voice upload endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return; // let the browser handle it
  }

  // HTML navigations — network first, fall back to cache
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          // Offline fallback — try the memory root
          const rootCached = await caches.match("/memory");
          if (rootCached) return rootCached;
          return new Response(
            "<h1>Offline</h1><p>Autonomous Memory needs a connection to sync.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }
      })(),
    );
    return;
  }

  // Static assets — cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
  }
});
