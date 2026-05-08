const CACHE = 'podcast-postline-v0.1.0';
const APP_SHELL = [
  '/podcast-postline/',
  '/podcast-postline/index.html',
  '/podcast-postline/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/podcast-postline/'))));
});

