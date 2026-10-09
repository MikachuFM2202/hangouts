// Service worker: only here for push notifications. No fetch handler, so it never caches or serves stale pages.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data?.json() || {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'hangouts', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icon-192.png', badge: 'icon-192.png',
      data: { hash: /^#\w+$/.test(d.url || '') ? d.url : '#ask' }, vibrate: [80, 60, 80, 60, 160],
    });
    // An open app syncs straight away, so the love animation plays without waiting for the 30s poll.
    (await self.clients.matchAll({ type: 'window' })).forEach(c => c.postMessage({ type: 'push' }));
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const hash = e.notification.data?.hash || '#ask';
  e.waitUntil((async () => {
    const [c] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (c) { await c.focus(); c.postMessage({ type: 'open', hash }); }
    else await self.clients.openWindow(new URL(hash, self.registration.scope).href);
  })());
});
