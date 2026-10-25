// Network first, cache as fallback: online players always get the latest files
// (no stale versions), offline players get the last copy they loaded.
const CACHE = 'pong-v22';
// Only these origins are cached. Everything else (e.g. the TURN credentials API) goes straight to the network.
const CACHEABLE = [self.location.origin, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://unpkg.com'];

// Precache what index.html references, plus the font files the Google Fonts CSS points to,
// so the very first offline launch works. Reading the page keeps this list in step with it.
async function precache() {
  const cache = await caches.open(CACHE);
  const html = await (await fetch('index.html', { cache: 'no-store' })).text();
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1])
    .filter(u => !u.startsWith('data:') && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\/?$/.test(u));
  const local = refs.filter(u => !/^https?:/.test(u));
  await cache.addAll(['./', 'index.html', ...local]);
  // Third-party files are best effort: a CDN hiccup shouldn't stop the game installing
  const remote = refs.filter(u => /^https?:/.test(u));
  await Promise.allSettled(remote.map(u => cache.add(u)));
  const fontCss = remote.find(u => u.startsWith('https://fonts.googleapis.com/css'));
  const cssRes = fontCss && await cache.match(fontCss);
  if (cssRes) {
    const fonts = [...(await cssRes.text()).matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
    await Promise.allSettled(fonts.map(u => cache.add(u)));
  }
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !CACHEABLE.includes(new URL(req.url).origin)) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }))
  );
});
