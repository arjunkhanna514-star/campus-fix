// Campus Fix service worker: keeps the app shell (scripts, fonts, icons) so the
// installed app opens quickly. Data from the server is never cached.
const SHELL = 'campus-fix-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  const isAsset = url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/') || /\.(png|ttf|woff2?|ico)$/.test(url.pathname);
  if (!isAsset) return; // pages always come fresh from the server
  event.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const res = await fetch(event.request);
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })
  );
});
