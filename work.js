const CACHE_NAME = "absensi-tei-v2"; // Naikkan versi jika ada perubahan

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./logo.png" // Pastikan namanya persis sama dengan file di folder kamu
];

// INSTALL: Simpan aset ke dalam cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Service Worker: Caching assets...");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: Hapus cache lama
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: Clearing old cache...");
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// FETCH: Ambil dari cache jika offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => {
          // Opsional: berikan halaman fallback jika benar-benar offline dan aset tidak di-cache
        });
      })
  );
});
