const CACHE = 'domino-v3'; // BUG ARREGLADO: este nombre nunca cambiaba entre despliegues, así que
                            // la caché del dispositivo se quedaba con archivos viejos para siempre.
                            // Subir este número fuerza a borrar la caché antigua de cada usuario.
const STATIC = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // BUG ARREGLADO: script/style/image/font usaban "primero caché" — una vez
  // guardado un archivo, nunca se volvía a comprobar si había uno nuevo.
  // Los bundles de Vite llevan hash en el nombre así que en teoría cambian
  // de URL solos, pero en un WebView/APK no podemos fiarnos del todo de
  // eso. Ahora es "red primero, caché solo si falla la red" — así un
  // archivo nunca se queda obsoleto de forma permanente.
  if (['script', 'style', 'image', 'font'].includes(e.request.destination)) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
  }
});

self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json();
  self.registration.showNotification(d.title || 'DOMINO', {
    body: d.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: d.url || '/' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if (c.url === e.notification.data?.url && 'focus' in c) return c.focus();
    if (clients.openWindow) return clients.openWindow(e.notification.data?.url || '/');
  }));
});
