// Service Worker — Cache-first for static assets, network-first for API
const CACHE_NAME = "cabin-app-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/gallery.html",
  "/diary.html",
  "/notes.html",
  "/reconstruction.html",
  "/admin.html",
  "/style.css",
  "/common.js",
  "/script.js",
  "/gallery.js",
  "/diary.js",
  "/notes.js",
  "/reconstruction.js",
  "/admin.js",
  "/favicon.png",
];

// External CDN assets to precache
const CDN_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css",
  "https://cdn.jsdelivr.net/npm/flatpickr",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
];

// ─── Install ───────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local assets (fail silently for individual items)
      const localPromises = STATIC_ASSETS.map((url) =>
        cache.add(url).catch((err) => console.warn("SW: skip caching", url, err.message))
      );
      // Try to cache CDN assets too (best-effort)
      const cdnPromises = CDN_ASSETS.map((url) =>
        cache.add(url).catch((err) => console.warn("SW: skip CDN", url, err.message))
      );
      return Promise.all([...localPromises, ...cdnPromises]);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ─── Activate — clean old caches ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategy ───────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests → Network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Upload images → Cache-first (immutable, UUID filenames)
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Static assets (HTML, CSS, JS) → Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Strategies ───────────────────────────────────────────────

/**
 * Cache-first: return from cache, only fetch if not cached.
 * Best for immutable resources (uploaded images with UUID names).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

/**
 * Network-first: try network, fall back to cache.
 * Best for API data that needs freshness.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Stale-while-revalidate: return cache immediately, update in background.
 * Best for static assets that change occasionally.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
