const CACHE_NAME = "miquizzero-cache-v3.1.0";

const ASSETS = [
  "index.html",
  "bootstrap.min.css",
  "style.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", event =>
{
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", event =>
{
    event.respondWith(caches.match(event.request)
    .then(cached => 
    {
        return cached || fetch(event.request);
    }));
});
