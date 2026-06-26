/**
 * DOMINO PWA — Service Worker v4
 * Estrategia: Network-first con fallback a caché para navegación,
 * Stale-while-revalidate para assets estáticos.
 */

const CACHE_NAME = 'domino-v4';
const OFFLINE_URL = '/index.html';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── INSTALL: pre-cachear assets críticos ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar cachés antiguas ─────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia por tipo de recurso ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Solo interceptar peticiones HTTP/HTTPS
  if (!request.url.startsWith('http')) return;

  // No interceptar peticiones a la API del backend
  if (request.url.includes('railway.app') || request.url.includes('/api/')) return;

  // Navegación: Network-first con fallback a index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Assets estáticos (scripts, estilos, imágenes, fuentes): Stale-while-revalidate
  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'DOMINO', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'DOMINO 🎲', {
      body: data.body || 'Tienes una nueva notificación',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'domino-notification',
      renotify: true,
      data: { url: data.url || '/' },
      actions: data.actions || [],
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── BACKGROUND SYNC (para envíos offline) ─────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending-gifts') {
    event.waitUntil(syncPendingGifts());
  }
});

async function syncPendingGifts() {
  // Placeholder para sincronización de regalos pendientes offline
  console.log('[SW] Sincronizando regalos pendientes...');
}
