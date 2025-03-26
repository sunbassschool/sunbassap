/// <reference lib="webworker" />
import { openDB } from "idb";
const CACHE_NAME = "static-cache-v6";
const STATIC_ASSETS = [
    "/", "/index.html", "/assets/main.css",
    "/favicon.ico", "/bootstrap/dist/css/bootstrap.min.css",
    "/@fortawesome/fontawesome-free/css/all.css",
    "/bootstrap-icons/font/bootstrap-icons.css"
];
// ✅ Installation : mise en cache des fichiers statiques
self.addEventListener("install", (event) => {
    console.log("✅ Service Worker installé");
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => {
        console.log("📂 Mise en cache des fichiers statiques...");
        return cache.addAll(STATIC_ASSETS);
    }));
    self.skipWaiting();
});
// ✅ Activation : suppression des anciens caches
// ✅ Activation : suppression des anciens caches + rafraîchissement des clients
self.addEventListener("activate", (event) => {
    console.log("✅ Service Worker activé !");
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((cache) => cache !== CACHE_NAME)
            .map((cache) => {
            console.log("🗑️ Suppression de l'ancien cache :", cache);
            return caches.delete(cache);
        }));
        // 🔄 Forcer le rafraîchissement des clients actifs
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => {
            console.log("🔄 Rafraîchissement du client :", client.url);
            client.navigate(client.url);
        });
        self.clients.claim();
    })());
});
// ✅ Gestion des requêtes réseau avec cache
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    // 🔄 Ignorer les requêtes locales en développement
    if (url.origin.includes("localhost"))
        return;
    // ⏩ Exclure la requête `/api/refresh` du cache et forcer la requête réseau
    if (event.request.url.includes("/api/refresh")) {
        console.log("⏩ Exclusion du refresh JWT du cache :", event.request.url);
        event.respondWith(fetch(event.request)); // Force un appel direct au serveur
        return;
    }
    // ⏩ Ignorer les autres requêtes API distantes (ne pas les stocker)
    if (event.request.url.includes("/api/") || event.request.url.includes("cors-proxy")) {
        console.log("⏩ Requête API ignorée :", event.request.url);
        return;
    }
    // 📂 Servir les fichiers statiques depuis le cache
    event.respondWith((async () => {
        // Vérifie si la requête est pour un document HTML (ex : index.html)
        if (event.request.mode === "navigate") {
            try {
                // Essaye de charger la version réseau en priorité
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            }
            catch (error) {
                // En cas d'échec (hors ligne), retourne la version en cache
                return (await caches.match(event.request)) || (await caches.match("/index.html")) ||
                    new Response("Offline", { status: 503, statusText: "Service Unavailable" });
            }
        }
        // Gestion normale des autres ressources statiques
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse)
            return cachedResponse;
        const networkResponse = await fetch(event.request);
        if (event.request.destination !== "document") {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
    })());
});
// ✅ Gestion du rafraîchissement du JWT via Background Sync
self.addEventListener("periodicsync", async (event) => {
    if (event.tag === "refresh-jwt") {
        event.waitUntil(refreshJWTInBackground());
    }
});
// ✅ Enregistrement d'une alarme pour le refresh JWT (10 min)
self.addEventListener("message", async (event) => {
    if (event.data && event.data.type === "REGISTER_ALARM") {
        const registration = await navigator.serviceWorker.ready;
        if ("alarms" in registration) {
            registration.alarms.create("refresh-jwt", { delayInMinutes: 10, periodInMinutes: 10 });
            console.log("✅ Alarm enregistrée pour le refresh JWT !");
        }
        else {
            console.warn("⚠️ Alarm API non supportée");
        }
    }
});
// ✅ Gestion du rafraîchissement du JWT
async function refreshJWTInBackground() {
    const refreshToken = await getRefreshTokenFromDB();
    if (!refreshToken) {
        console.warn("🚨 Aucun refresh token trouvé, arrêt du rafraîchissement.");
        return;
    }
    const expirationTime = await getRefreshTokenExpirationFromDB();
    console.log("🔍 Vérification du refresh token...");
    console.log("⏳ Expiration enregistrée :", new Date(expirationTime).toLocaleString());
    console.log("🕒 Heure actuelle :", new Date().toLocaleString());
    console.log("📌 Différence (sec) :", (expirationTime - Date.now()) / 1000);
    if (Date.now() > expirationTime) {
        console.warn("⏳ Refresh token expiré ! Arrêt du rafraîchissement en arrière-plan.");
        return;
    }
    try {
        const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbwb2LjHbYqgEALYbg_RqfkRgu4Pfux48f1JnFOjGAU1J0aD5u_pY6CJ-oTFfOSk7HCR/exec?route=refresh&refreshToken=${refreshToken}`);
        const data = await response.json();
        if (data.jwt && data.refreshToken) {
            console.log("✅ Nouveau JWT reçu en arrière-plan !");
            await updateTokens(data.jwt, data.refreshToken);
            // 🔥 Mise à jour de l'expiration du refresh token dans IndexedDB
            const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
            await updateRefreshTokenExpirationInDB(newExpirationTime);
            console.log("✅ Nouvelle expiration du refresh token enregistrée :", new Date(newExpirationTime).toLocaleString());
        }
        else {
            console.warn("❌ Impossible de rafraîchir le token.");
        }
    }
    catch (error) {
        console.error("❌ Erreur lors du rafraîchissement du JWT en arrière-plan :", error);
        // 🔥 Si le refresh échoue, on supprime les tokens pour éviter une session invalide
        await updateTokens("", "");
        console.warn("⚠️ Tokens supprimés après échec du refresh !");
    }
}
// ✅ Stocke le refresh token et son expiration en IndexedDB
async function getRefreshTokenFromDB() {
    // 🔥 Vérifie d'abord dans localStorage
    const jwt = localStorage.getItem("jwt");
    if (jwt)
        return jwt;
    // Sinon, va chercher dans IndexedDB
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const token = await store.get("refreshToken"); // ✅ Correct !
    return token?.value || null;
}
async function getRefreshTokenExpirationFromDB() {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const expirationEntry = await store.get("refreshTokenExpiration");
    return expirationEntry?.value || 0;
}
async function updateRefreshTokenExpirationInDB(expiration) {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
    await store.put({ key: "refreshTokenExpiration", value: expiration });
}
// ✅ Met à jour le JWT et le refresh token en IndexedDB
async function updateTokens(newJwt, newRefreshToken) {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
    await store.put({ key: "jwt", value: newJwt });
    await store.put({ key: "refreshToken", value: newRefreshToken });
    // 🔥 Ajout du stockage rapide dans localStorage
    localStorage.setItem("jwt", newJwt);
    console.log("✅ JWT mis à jour dans IndexedDB et localStorage !");
}
// ✅ Forcer la mise à jour du SW sans bloquer l’utilisateur
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
