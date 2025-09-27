const CACHE_NAME = "inventory-cache-v1";
const urlsToCache = [
    "index.html",
    "style.css",
    "app.js",
    "manifest.json",
    "icons/icon-192.png",
    "icons/icon-512.png"
];

// Install event – caches static files
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event – serve cached files if offline
self.addEventListener("fetch", event => {
    const requestUrl = new URL(event.request.url);

    // Only cache same-origin requests (your images)
    if (requestUrl.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) return response;

                return fetch(event.request).then(networkResponse => {
                    // Cache the new file
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            }).catch(() => {
                // Fallback if offline and file not cached
                if (event.request.destination === "image") {
                    // Optional: return a placeholder image
                    return new Response(
                        `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                        <rect width="200" height="200" fill="#ddd"/>
                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#aaa">No Image</text>
                        </svg>`,
                        { headers: { "Content-Type": "image/svg+xml" } }
                    );
                }
            })
        );
    } else {
        // External requests – just fetch normally
        event.respondWith(fetch(event.request));
    }
});

// Activate event – clean old caches if needed
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
});
