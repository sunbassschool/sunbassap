// 📦 Nom du cache
const CACHE_NAME = "sunbassschool-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo-192x192.png",
  "/logo-512x512.png",
];

// 🔧 Installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Mise en cache des fichiers...");
      return cache.addAll(URLS_TO_CACHE);
    })
  );

  self.skipWaiting();
});

// 🚀 Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activé");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("🗑️ Suppression du vieux cache :", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// 🌐 Interception des requêtes
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🔄 Ignorer les requêtes vers l'API (Google Apps Script et Proxy CORS)
  if (url.includes("script.google.com") || url.includes("cors-proxy")) {
    console.log("🚀 Requête API ignorée :", url);
    return;
  }

  console.log("🔄 Interception de la requête :", url);

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch((error) => {
          console.error("❌ Erreur réseau pour :", url, error);
          return new Response("Erreur de connexion", { status: 503 });
        })
      );
    })
  );
});
