const CACHE = 'rolescout-20260710c';   // M1: bump on EVERY index.html deploy

// M16: every external API host
const BYPASS = [
  'raw.githubusercontent.com',
];

self.addEventListener('install', e => {
  // M4: individual cache.put, never addAll
  e.waitUntil(
    caches.open(CACHE)
      .then(c => fetch('./index.html').then(res => c.put('./index.html', res)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (BYPASS.some(h => url.hostname.includes(h))) return; // API calls hit network

  // M5: serve app shell by request MODE
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  })));
});
