const CACHE_NAME = "static-cache-v4";
const STATIC_ASSETS = [
  "/", "/index.html", "/assets/main.css",
  "/favicon.ico", "/bootstrap/dist/css/bootstrap.min.css",
  "/@fortawesome/fontawesome-free/css/all.css",
  "/bootstrap-icons/font/bootstrap-icons.css"
];

// ✅ Installation : mise en cache des fichiers statiques
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📂 Mise en cache des fichiers statiques...");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Force l'activation immédiate du nouveau SW
});

// ✅ Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activé !");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cache) => cache !== CACHE_NAME)
          .map((cache) => {
            console.log("🗑️ Suppression de l'ancien cache :", cache);
            return caches.delete(cache);
          })
      );
    })
  );
  self.clients.claim();
});

// ✅ Gestion des requêtes
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 🔄 Bypass le cache pour l'API Google Apps Script
  if (url.href.includes("script.google.com")) {
    console.log("⏩ Bypass du cache pour API :", url.href);
    return;
  }

  // 📂 Servir les fichiers statiques depuis le cache
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.startsWith(location.origin)) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    })
  );
});

// ✅ Forcer la mise à jour sans bloquer l’utilisateur
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
