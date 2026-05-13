const CACHE_NAME = "ABSEN TEI";

// Daftar file yang akan disimpan secara offline
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./LOGO SEKOLAH.png",
  "./manifest.json" // Pastikan manifestjson.txt sudah di-rename menjadi manifest.json
];

// Tahap Install: Simpan aset ke Cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Service Worker: Membuka Cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Tahap Fetch: Ambil data dari Cache jika offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Jika ada di cache, pakai cache. Jika tidak, ambil dari jaringan.
      return response || fetch(event.request);
    })
  );
});

// Tahap Activate: Bersihkan cache versi lama
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: Menghapus cache lama");
            return caches.delete(key);
          }
        })
      );
    })
  );
});
