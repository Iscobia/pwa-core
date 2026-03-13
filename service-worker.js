// service-worker.js - STABLE (OneSignal + notifications natives + actions)
console.log('[Service Worker] Chargement');

// ✅ OneSignal désactivé pour l’instant : évite les handlers de click qui ouvrent "/"
// (à réactiver quand ton backend OneSignal sera prêt)
/*
try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
  console.log('[SW] OneSignal SDK chargé');
} catch (error) {
  console.log('[SW] OneSignal non chargé (Firefox protection)');
}
*/

const CACHE_NAME = 'evolution-cache-v1.0.1';
const DEFAULT_ICON = '/core/assets/icons/default-192.png';

const urlsToCache = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/theme.css',
  '/data/defis.js',
  '/core/style.css',
  '/core/app.js',
  '/core/notifications.js'
];


self.addEventListener('install', (event) => {
  console.log('[SW] Installation');
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const url of urlsToCache) {
      try {
        await cache.add(url);
        console.log('[SW] Cache OK:', url);
      } catch (e) {
        console.warn('[SW] Cache impossible:', url, e);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('onesignal.com')) return;
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});

// Notifications natives (quotidienne + test)
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data.action !== 'SEND_NOTIFICATION') return;

    const { appId, appName, jour, titre, description, isTest, icon, badge, url, tag } = data;

    const notifTitle = isTest
      ? `🎯 ${appName} - Test - Jour ${jour} - ${titre}`
      : `${appName} - Jour ${jour} - ${titre}`;

    self.registration.showNotification(notifTitle, {
      body: (description || '').substring(0, 240),
      icon: icon || DEFAULT_ICON,
      badge: badge || icon || DEFAULT_ICON,
      tag: tag || `${appId || 'app'}-jour-${jour}`,
      requireInteraction: true,
      data: { jour: String(jour), url: url || self.location.origin },
      actions: [
        { action: 'view', title: '👁️ Voir' },
        { action: 'mark-done', title: '✅ Marquer' },
        { action: 'settings', title: '⚙️ Paramètres' },
      ],
    });

    console.log('[SW] Notification affichée:', notifTitle);
  } catch (e) {
    console.error('[SW] Erreur message:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  try {
    const action = event.action;
    const data = event.notification.data || {};
    event.notification.close();

    const appUrl = data.url || self.location.origin;

    event.waitUntil((async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      if (action === 'mark-done') {
        list.forEach((client) => {
          client.postMessage({
            action: 'MARK_DONE',
            jour: data.jour
          });
        });
      }

      const matchingClient = list.find((client) => client.url === appUrl);

      if (matchingClient) {
        await matchingClient.focus();
        return;
      }

      await clients.openWindow(appUrl);
    })());

  } catch (e) {
    console.error('[SW] Erreur notificationclick:', e);
  }
});
