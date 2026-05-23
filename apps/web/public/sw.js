/* NELVYON PWA Service Worker */
const CACHE_NAME = "nelvyon-pwa-v1";
const OFFLINE_URL = "/offline";
const STATIC_ASSETS = ["/", "/dashboard", "/manifest.json", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.hostname.includes("railway.app");
}

function isStaticAsset(url) {
  const ext = url.pathname.split(".").pop() || "";
  return ["js", "css", "png", "jpg", "jpeg", "webp", "svg", "woff", "woff2", "ico"].includes(ext);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() =>
          caches.match(req).then((cached) => cached || new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })),
        ),
    );
    return;
  }

  if (isStaticAsset(url) || url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))),
  );
});
