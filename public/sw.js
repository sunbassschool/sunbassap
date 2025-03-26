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
// 🌐 Interception des requêtes
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🔄 Ignorer les requêtes vers l'API (Google Apps Script, Proxy CORS, et refresh token)
  if (url.includes("script.google.com") || url.includes("cors-proxy") || url.includes("refreshToken")) {
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
async function refreshJWTInBackground() {
  const refreshToken = await getRefreshTokenFromDB();
  if (!refreshToken) return;

  const response = await fetch(`/refresh?token=${refreshToken}`);
  const data = await response.json();

  if (data.jwt) {
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readwrite");
      const store = tx.objectStore("authStore");

      await store.put({ key: "jwt", value: data.jwt });
      await store.put({ key: "refreshToken", value: data.refreshToken });

      console.log("✅ JWT rafraîchi en arrière-plan !");
  }
}

self.addEventListener("periodicsync", async (event) => {
  if (event.tag === "refresh-jwt") {
      event.waitUntil(refreshJWTInBackground());
  }
});


