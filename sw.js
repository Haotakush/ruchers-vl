/* ============================================================
   Service Worker — Ruchers VL
   Cache-first pour les assets statiques.
   Notification de mise à jour quand une nouvelle version est dispo.

   ⚠️  À CHAQUE DÉPLOIEMENT : changer CACHE_VERSION ci-dessous
       pour invalider l'ancien cache et déclencher la mise à jour.
   ============================================================ */

const CACHE_VERSION = 'ruchers-vl-v2.0.3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/firebase-init.js',
  './js/data.js',
  './js/ui.js',
  './js/journal.js',
  './js/sanitaire.js',
  './js/ruchers.js',
  './js/dashboard.js',
  './js/carte.js',
  './js/registre.js',
  './js/params-sync.js',
  './js/documents.js',
  './js/mouvements.js',
  './js/firebase-db.js',
  './js/app.js',
  './js/firebase-auth.js',
  './js/admin-conformite.js',
];

/* ---- Installation : mise en cache des assets ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => console.log(`[SW] Cache ${CACHE_VERSION} créé`))
  );
  // Ne pas appeler skipWaiting() ici — on attend que l'utilisateur confirme
});

/* ---- Activation : nettoyage des anciens caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => {
            console.log(`[SW] Suppression ancien cache : ${k}`);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- Fetch : cache-first pour les assets locaux ---- */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ne pas intercepter Firebase, Google APIs, CDN externes
  // (ces requêtes ont besoin d'aller sur le réseau)
  if (
    url.includes('firebase') ||
    url.includes('googleapis') ||
    url.includes('gstatic.com') ||
    url.includes('firebasestorage') ||
    url.includes('fonts.goog') ||
    url.includes('cdnjs.cloudflare') ||
    url.includes('openstreetmap') ||
    url.includes('tile.osm') ||
    event.request.method !== 'GET'
  ) {
    return; // laisse passer sans intercepter
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache-first : on retourne le cache si disponible
      if (cached) return cached;

      // Sinon on fetch et on met en cache
      return fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION)
              .then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors ligne et pas en cache → réponse de fallback
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

/* ---- Message SKIP_WAITING : déclenché par le bouton "Mettre à jour" ---- */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] skipWaiting déclenché par l\'utilisateur');
    self.skipWaiting();
  }
});
