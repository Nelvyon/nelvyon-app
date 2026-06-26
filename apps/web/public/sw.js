/* NELVYON PWA — network first, cache fallback */
const CACHE_NAME = "nelvyon-saas-v2";
const LEGACY_CACHE = "nelvyon-v1";
const PRECACHE_URLS = ["/", "/dashboard", "/offline.html", "/saas/dashboard", "/offline-saas.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== LEGACY_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API calls or auth-sensitive routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  const isSaasNav = req.mode === "navigate" && url.pathname.startsWith("/saas");
  const isLegacyNav = req.mode === "navigate" && !url.pathname.startsWith("/saas");

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (isSaasNav) return caches.match("/offline-saas.html");
          if (isLegacyNav) return caches.match("/offline.html");
          return new Response("", { status: 408 });
        }),
      ),
  );
});
