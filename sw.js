const CACHE_NAME = 'smartstudy-shell-v1';
const ASSETS = [
  '/index.html','/styles.css','/app.api.js','/sw.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});

self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', event=>{
  const url = new URL(event.request.url);
  if(url.pathname.includes('/api/') || url.searchParams.get('p')){
    event.respondWith(fetch(event.request).catch(()=> caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(r=> r || fetch(event.request).then(res=>{
    return caches.open(CACHE_NAME).then(cache=>{ cache.put(event.request, res.clone()); return res; });
  })).catch(()=> caches.match('/index.html')));
});