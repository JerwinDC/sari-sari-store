const CACHE_NAME = "inventory-cache-v2"; // keep your version
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// Install – cache files
self.addEventListener("install", (event) => {
    console.log("[SW] Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Caching app files");
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate new SW immediately
});

// Activate – clean old caches
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating...");
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

// Fetch – serve cached files first, fallback to network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request)
                .then((networkResponse) => {
                    // Cache new requests dynamically
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone()); // fixed
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Offline fallback
                    if (event.request.destination === "document") {
                        return caches.match("/index.html");
                    }
                });
        })
    );
});
