const CACHE_NAME = "personal-work-os-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || request.mode === "navigate") return;
  if (!["script", "style", "image", "font"].includes(request.destination)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    const network = fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()); return response; });
    return cached ?? network;
  }));
});
