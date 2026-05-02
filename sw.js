const CACHE_NAME = 'pong-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/styles.css',
  './js/01-audio.js',
  './js/02-config-and-state.js',
  './js/03-effects-powerups-bricks.js',
  './js/04-classic-gameplay.js',
  './js/05-rendering.js',
  './js/06-survival.js',
  './js/07-tournament.js',
  './js/08-boot-and-test.js'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first so updates are picked up immediately, fall back to cache for offline
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
  );
});
