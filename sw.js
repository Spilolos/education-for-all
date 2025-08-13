// sw.js – cache app shell + runtime caching for api/images
const CACHE_NAME = 'edughana-shell-v1';
const ASSETS = [
  '/', '/index.html', '/auth.html',
  '/manifest.json',
  '/js/app.js', '/js/db.js', '/js/api.js', '/js/lessons.js', '/js/quizzes.js',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // App shell first
  if (ASSETS.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }

  // Runtime cache for Wikipedia + images: network-first, fall back to cache
  if (url.hostname.endsWith('wikipedia.org') || e.request.destination === 'image') {
    e.respondWith((async () => {
      try {
        const net = await fetch(e.request);
        const cache = await caches.open('runtime-v1');
        cache.put(e.request, net.clone());
        return net;
      } catch {
        const cached = await caches.match(e.request);
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Default: cache-first then network
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    return cached || fetch(e.request);
  })());
});
