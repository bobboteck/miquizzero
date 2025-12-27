const CACHE_NAME = "pwa-miquizzero-v4";

const ASSETS = [
  "/",
  "/index.html",
  "/bootstrap.min.css",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

/* INSTALL */
self.addEventListener("install", event =>
{
    console.log("[SW] Install");
    self.skipWaiting();

    event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    {
        return cache.addAll(ASSETS);
    }));
});

/* ACTIVATE */
self.addEventListener("activate", event =>
{
    console.log("[SW] Activate");

    event.waitUntil(caches.keys().then(keys =>
    {
        return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key =>
        {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
        }));
    })
    .then(() => self.clients.claim()));
});

/* FETCH */
self.addEventListener("fetch", event =>
{
    /* NAVIGAZIONE (index.html) → NETWORK FIRST */
    if (event.request.mode === "navigate")
    {
        event.respondWith(fetch(event.request)
        .then(response =>
        {
            const copy = response.clone();
            
            caches.open(CACHE_NAME).then(cache =>
            {
                cache.put(event.request, copy);
            });
            return response;
        })
        .catch(() => caches.match(event.request)));
        
        return;
    }

    /* FILE STATICI → CACHE FIRST */
    event.respondWith(caches.match(event.request).then(cached =>
    {
        if (cached)
        {
            return cached;
        }

        return fetch(event.request).then(response => 
        {
            if (!response || response.status !== 200)
            {
                return response;
            }

            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache =>
            {
                cache.put(event.request, copy);
            });

            return response;
        });
    }));
});
