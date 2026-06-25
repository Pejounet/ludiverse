const CACHE = 'ludiverse-v5';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Installation : on met en cache les assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a).catch(()=>{}))))
  );
  // Force l'activation immédiate sans attendre la fermeture des onglets
  self.skipWaiting();
});

// Activation : on supprime les anciens caches et on prend le contrôle immédiatement
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : réseau en priorité, cache en fallback
self.addEventListener('fetch', e => {
  // Pour index.html : toujours essayer le réseau en premier
  if(e.request.url.includes('index.html') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Pour les autres assets : cache en priorité
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

// Notifications push
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {title:'Le Ludiverse',body:'Tu as des jeux à reviewer !'};
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'ludiverse-review',
    renotify: true,
    data: { url: './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || './'));
});
