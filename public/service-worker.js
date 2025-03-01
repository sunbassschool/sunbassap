const STATIC_CACHE_NAME = "static-cache-v3"; // 🔄 Change à chaque mise à jour
const API_CACHE_NAME = "api-cache-v3"; // 🔄 Change si nécessaire
const ASSETS_TO_CACHE = [
  "/", 
  "/index.html", 
  "/styles.css", // Remplace par ton fichier CSS
  "/main.js", // Remplace par ton fichier JS principal
  "/images/logo.png"
];

// 📌 Mise en cache des fichiers statiques à l’installation
// 📌 Mise en cache des fichiers statiques à l’installation
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé, mise en cache des fichiers statiques...");
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 🔥 Active immédiatement la nouvelle version
});

// 📌 Activation du nouveau Service Worker et suppression des anciens caches
self.addEventListener("activate", (event) => {
  console.log("✅ Nouveau Service Worker activé !");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== API_CACHE_NAME) {
            console.log("🗑️ Suppression de l'ancien cache :", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // 🔥 Force immédiatement l'utilisation du nouveau Service Worker
});



// 📌 Intercepter les requêtes et servir depuis le cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ⚡ Servir les fichiers statiques depuis le cache
  if (ASSETS_TO_CACHE.includes(url.pathname) || url.href.includes("sunbassschool.com")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return; // 🔄 Évite d'exécuter la suite du code pour ces fichiers
  }

  // 📌 Mettre en cache les requêtes API (JWT, refresh, etc.)
  if (url.pathname.includes("/exec")) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        if (event.request.method !== "GET") return fetch(event.request); // 🔄 Ne met en cache que les requêtes GET

        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          console.log("⚡ Servi depuis le cache :", event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
              console.log("✅ Réponse API mise en cache :", event.request.url);
            }
            return response;
          })
          .catch(() => {
            console.error("❌ Erreur : API inaccessible et pas de cache dispo", event.request.url);
          });
      })
    );
  }
});

