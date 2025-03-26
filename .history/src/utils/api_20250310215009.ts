declare global {
  interface Window {
      latestJWT?: string;
  }
}


import { openDB } from "idb";
import axios from "axios";
import router
let refreshInProgress: Promise<string | null> | null = null;
let refreshAttempts = 0; // 🔄 Compteur de tentatives de refresh
const MAX_REFRESH_ATTEMPTS = 3; // ⛔ Limite anti-boucle


let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
export async function getRefreshTokenFromDB() {
  console.log("🔄 Récupération du refresh token...");

  // 1️⃣ Vérifie d'abord dans les cookies
  const cookies = document.cookie.split("; ");
  const refreshTokenCookie = cookies.find(row => row.startsWith("refreshToken="));
  if (refreshTokenCookie) {
    const refreshToken = refreshTokenCookie.split("=")[1];
    console.log("🍪 Refresh token trouvé dans les cookies :", refreshToken);
    return refreshToken;
  }

  // 2️⃣ Vérifie IndexedDB
  await verifyIndexedDBSetup();
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readonly");
  const store = tx.objectStore("authStore");
  const refreshTokenEntry = await store.get("refreshToken");

  if (refreshTokenEntry?.value) {
    console.log("💾 Refresh token trouvé dans IndexedDB :", refreshTokenEntry.value);
    return refreshTokenEntry.value;
  }

  // 3️⃣ Vérifie LocalStorage
  const localStorageToken = localStorage.getItem("refreshToken");
  if (localStorageToken) {
    console.log("📦 Refresh token trouvé dans LocalStorage :", localStorageToken);
    return localStorageToken;
  }

  console.warn("❌ Aucun refresh token trouvé ! Attente 500ms et second check...");

  // 4️⃣ **Attendre un court instant puis revérifier (évite le bug de timing)**
  await new Promise(resolve => setTimeout(resolve, 500));

  // Re-tente une récupération après un court délai
  const retryLocalStorageToken = localStorage.getItem("refreshToken");
  if (retryLocalStorageToken) {
    console.log("📦 (Retry) Refresh token trouvé dans LocalStorage :", retryLocalStorageToken);
    return retryLocalStorageToken;
  }

  console.error("🚨 AUCUN refresh token trouvé même après second check !");
  return null;
}


export function deleteAllCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${location.hostname}`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  console.log("✅ Tous les cookies supprimés !");
}




export async function restoreSession() {
  console.log("🔄 Restauration de session...");
  return true; // 🚀 À adapter en fonction de ton système d'authentification
}

// ✅ Rafraîchissement automatique du JWT toutes les 10 minutes
export function scheduleJwtRefresh() {
  setTimeout(async () => {
    console.log("🔄 Tentative de rafraîchissement du JWT...");
    const newJwt = await refreshToken();

    if (!newJwt) {
      console.error("❌ Refresh échoué, l'utilisateur sera redirigé.");
      await logoutUser(); // Déconnecte si le refresh échoue plusieurs fois
    } else {
      console.log("✅ JWT rafraîchi avec succès !");
    }

    scheduleJwtRefresh(); // 🔄 Relancer après exécution
  }, 10 * 60 * 1000); // ⏳ Toutes les 10 minutes
}






export async function verifyIndexedDBSetup() {
  if (!window.indexedDB) {
    console.error("❌ IndexedDB n'est pas supporté par ce navigateur !");
    return false; // ⛔ Empêcher les accès futurs
  }

  try {
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          db.createObjectStore("authStore", { keyPath: "key" });
          console.log("✅ Object store 'authStore' recréé !");
        }
      }
    });

    console.log("🔍 IndexedDB vérifié !");
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l’accès à IndexedDB :", error);
    return false;
  }
}


export async function updateJWTInIndexedDB(newJwt: string) {
    if (!newJwt) return;
    
    try {
        const db = await openDB("AuthDB", 1);
        const tx = db.transaction("authStore", "readwrite");
        const store = tx.objectStore("authStore");
        await store.put({ key: "jwt", value: newJwt });

        console.log("✅ JWT mis à jour dans IndexedDB :", newJwt);
    } catch (err) {
        console.warn("⚠️ Erreur lors de l'enregistrement du JWT dans IndexedDB :", err);
    }
}
export async function getRefreshTokenExpirationFromDB() {
  try {
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");
      const expirationEntry = await store.get("refreshTokenExpiration");
      return expirationEntry?.value || 0;
  } catch (err) {
      console.warn("⚠️ Erreur lors de la récupération de l'expiration du refresh token depuis IndexedDB :", err);
      return 0;
  }
}
export async function restoreTokensToIndexedDB() {
  console.log("🔄 Vérification et restauration des tokens dans IndexedDB...");

  const indexedDBAvailable = await verifyIndexedDBSetup();
  if (!indexedDBAvailable) {
    console.warn("❌ Impossible d'utiliser IndexedDB.");
    return;
  }

  // 🔍 Récupère le JWT et le refreshToken depuis localStorage/sessionStorage
  const storedJwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
  const storedRefreshToken = localStorage.getItem("refreshToken");

  if (storedJwt) {
    console.log("📥 Restauration du JWT dans IndexedDB...");
    await updateJWTInIndexedDB(storedJwt);
  }

  if (storedRefreshToken) {
    console.log("📥 Restauration du refreshToken dans IndexedDB...");
    await updateRefreshTokenInDB(storedRefreshToken);
  }

  console.log("✅ IndexedDB restauré avec les tokens !");
}

export async function getJWTFromIndexedDB() {
  await verifyIndexedDBSetup(); // 🔥 Vérification avant de tenter un accès

  try {
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");
      const result = await store.get("jwt");

      return result?.value || null;
  } catch (error) {
      console.error("❌ Erreur lors de l'accès à IndexedDB :", error);
      return null;
  }
}





export async function getToken(): Promise<string | null> {
  return localStorage.getItem("jwt") || sessionStorage.getItem("jwt") || await getJWTFromIndexedDB();
}






export function getUserRole(): string | null {
  let token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (!token) return null;

  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded.role || null;
  } catch (error) {
    console.error("🚨 Erreur lors du décodage du token :", error);
    return null;
  }
}




// ✅ Vérifie que refreshToken est bien exporté


export async function preventIndexedDBCleanup() {
  console.log("🛡️ Protection contre la suppression d’IndexedDB...");
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");
  await store.put({ key: "keepAlive", value: Date.now() });

  setTimeout(preventIndexedDBCleanup, 24 * 60 * 60 * 1000); // 🔄 Ping toutes les 24h
}

export async function removeRefreshTokenFromDB() {
  try {
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readwrite");
      const store = tx.objectStore("authStore");
      await store.delete("refreshToken");

      console.log("✅ Refresh token supprimé d'IndexedDB !");
  } catch (error) {
      console.error("❌ Erreur lors de la suppression du refresh token :", error);
  }
}

export function isUserAdmin(): boolean {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) return false;

  try {
    const decoded = JSON.parse(atob(jwt.split(".")[1])); // Décodage du JWT
    return decoded.role === "admin"; // Vérifie si le rôle est "admin"
  } catch (error) {
    console.error("🚨 Erreur lors du décodage du token :", error);
    return false;
  }
}
export function isUserLoggedIn(): boolean {
  return !!localStorage.getItem("jwt"); // Vérifie simplement si un JWT est stocké
}
export async function deleteIndexedDB(dbName: string) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => {
      console.log(`✅ IndexedDB "${dbName}" supprimé avec succès !`);
      resolve(true);
    };

    request.onerror = (error) => {
      console.error(`❌ Erreur lors de la suppression de IndexedDB "${dbName}" :`, error);
      reject(error);
    };

    request.onblocked = () => {
      console.warn(`⚠️ Suppression de IndexedDB "${dbName}" bloquée.`);
    };
  });
}
export async function closeIndexedDBConnections(dbName: string) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.close();
      console.log(`🔒 Connexion à IndexedDB "${dbName}" fermée.`);
      resolve(true);
    };

    request.onerror = (error) => {
      console.error(`❌ Erreur lors de la fermeture de IndexedDB "${dbName}" :`, error);
      reject(error);
    };
  });
}

export async function forceDeleteIndexedDB(dbName: string) {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      console.log(`✅ IndexedDB "${dbName}" supprimée avec succès.`);
      resolve(true);
    };

    deleteRequest.onerror = (event) => {
      console.error(`❌ Erreur lors de la suppression de IndexedDB "${dbName}" :`, event);
      reject(event);
    };

    deleteRequest.onblocked = () => {
      console.warn(`⚠️ Suppression de IndexedDB "${dbName}" bloquée. Forçage en attente...`);
      setTimeout(async () => {
        console.log("🔄 Nouvelle tentative de suppression après blocage...");
        await forceDeleteIndexedDB(dbName);
      }, 1000);
    };
  });
}






export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  try {
    // 🛑 Bloque immédiatement tout refresh en cours
    if (typeof refreshInProgress !== "undefined") {
      refreshInProgress = Promise.resolve(null);
    }

    // 🔥 Supprime tous les cookies (compatibilité)
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "") // Supprime les espaces au début
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"); // Expiration forcée
    });

    console.log("🗑️ Cookies supprimés !");

    // ✅ Supprime uniquement les données de IndexedDB (sans supprimer la base)
    await clearIndexedDBData();

    // ✅ Supprime tous les tokens stockés (en parallèle pour optimiser)
    await Promise.all([
      sessionStorage.clear(),
      localStorage.removeItem("jwt"),
      localStorage.removeItem("refreshToken"),
      localStorage.removeItem("prenom")
    ]);

    console.log("✅ Données utilisateur nettoyées !");

    // ✅ Déclenche un événement pour informer les autres composants
    window.dispatchEvent(new Event("logout"));

    // ✅ Redirection après une courte pause
    setTimeout(() => {
      console.log("🔄 Redirection vers la page de connexion...");
      window.location.href = "/login";
    }, 300);

    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
    return false;
  }
}

/** ✅ Fonction qui VIDE IndexedDB sans le supprimer */
async function clearIndexedDBData() {
  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.delete("jwt");
    await store.delete("refreshToken");

    console.log("✅ IndexedDB vidé (JWT & RefreshToken supprimés) !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de IndexedDB :", error);
  }
}












export function setTokenCookies(jwt: string | undefined, refreshToken: string | undefined) {
  if (!refreshToken) return; // Sécurité : ne pas créer un cookie vide

  const maxAge = 30 * 24 * 60 * 60; // 30 jours en secondes (30 jours * 24h * 60min * 60s)

  document.cookie = `jwt=${jwt}; Max-Age=${maxAge}; Secure; SameSite=Strict; path=/`;
  document.cookie = `refreshToken=${refreshToken}; Max-Age=${maxAge}; Secure; SameSite=Strict; path=/`;

  console.log("✅ Cookies JWT et Refresh Token définis avec expiration longue !");
}


export async function checkAndRefreshJWT() {
  await syncRefreshToken(); // 🔄 Synchronisation avant de vérifier le JWT

  const token = await getToken();
  if (!token || isJwtExpired(token)) {
    console.warn("🚨 Pas de JWT valide, tentative de rafraîchissement...");
    
    // ✅ Cherche le refreshToken dans cookies, IndexedDB et LocalStorage
    let storedRefreshToken = await getRefreshTokenFromDB();

    if (!storedRefreshToken) {
      console.error("❌ Aucun refresh token disponible, déconnexion...");
      await logoutUser();
      return;
    }

    await refreshToken();
    return;
  }

  try {
    const decoded = JSON.parse(atob(token.split(".")[1])); // ✅ Vérifie si bien décodable
    console.log(`⏳ JWT expire à : ${new Date(decoded.exp * 1000).toLocaleString()}`);
  } catch (e) {
    console.error("❌ JWT corrompu, forçage de déconnexion.");
    await logout();
  }
}


export async function refreshToken() {
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    console.warn("⛔ Trop de tentatives de refresh, on arrête.");
    await handleRefreshFailure();
    return null;
  }
  console.log("🔄 Tentative de rafraîchissement du JWT...");

  let storedRefreshToken = localStorage.getItem("refreshToken") || await getRefreshTokenFromDB();

  if (!storedRefreshToken) {
    console.warn("⚠️ Aucun refresh token disponible.");
    await handleRefreshFailure();
    return null;
  }

  console.log("🔑 Refresh token envoyé à l'API :", storedRefreshToken);

  try {
      const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
          console.error(`🚨 Erreur HTTP ${response.status}`);
          throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success" && data.data?.jwt && data.data?.refreshToken) {
          console.log("✅ Refresh réussi !");
          await updateTokens(data.data.jwt, data.data.refreshToken);
          return data.data.jwt;
      } else {
          throw new Error("Réponse API invalide");
      }
  } catch (error) {
      console.error("❌ Erreur lors du refresh :", error);
      await handleRefreshFailure();
      return null;
  }
}











let isSyncing = false; // 🔒 Verrou global pour éviter les boucles infinies

export async function syncRefreshToken() {
  if (isSyncing) {
    console.log("🔄 Sync déjà en cours, on attend...");
    return;
  }

  isSyncing = true;

  try {
    const dbToken = await getRefreshTokenFromDB();
    const localToken = localStorage.getItem("refreshToken");
    const cookieToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1];

    // 🔥 Empêche la suppression accidentelle
    if (!dbToken && !localToken && !cookieToken) {
      console.error("🚨 AUCUN refresh token trouvé ! Reset obligatoire !");
      return;
    }

    // ✅ Correction de l’incohérence
    if (dbToken && localToken && cookieToken && (dbToken !== localToken || dbToken !== cookieToken)) {
      console.warn("⚠️ Incohérence détectée entre Cookies, IndexedDB et LocalStorage. Correction...");
      
      const validToken = dbToken.length > localToken.length ? dbToken : localToken; // Prend le plus long
      localStorage.setItem("refreshToken", validToken);
      document.cookie = `refreshToken=${validToken}; Secure; SameSite=Strict; path=/`;
      await updateRefreshTokenInDB(validToken);
    }

  } catch (error) {
    console.error("❌ Erreur de synchronisation :", error);
  }

  isSyncing = false;
}




export async function clearUserData() {
  console.log("🧹 Nettoyage complet des données utilisateur...");

  // 🔹 Supprimer toutes les données utilisateur dans localStorage
  Object.keys(localStorage).forEach(key => {
      if (
          key.startsWith("jwt") || 
          key.startsWith("refreshToken") || 
          key.startsWith("prenom") || 
          key.startsWith("userData_")
      ) {
          localStorage.removeItem(key);
          console.log(`🗑️ Clé supprimée : ${key}`);
      }
  });

  // 🔥 Supprime toutes les données de sessionStorage
  try {
    sessionStorage.clear();
    console.log("🗑️ sessionStorage vidé !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de sessionStorage :", error);
  }

  // 🔹 Suppression ciblée dans IndexedDB
  try {
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readwrite");
      const store = tx.objectStore("authStore");

      await store.delete("jwt");
      await store.delete("refreshToken");
      
      console.log("✅ JWT et refreshToken supprimés de IndexedDB !");
  } catch (error) {
      console.error("❌ Erreur lors du nettoyage de IndexedDB :", error);
  }
}

export async function fixRefreshTokenStorage() {
  console.trace("📌 Appel de fixRefreshTokenStorage"); // 🔍 Affiche la trace d'appel
  console.warn("🚨 Nettoyage des anciennes clés de refresh token ('refreshjwt')...");
  
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");

  await store.delete("refreshjwt");
  localStorage.removeItem("refreshjwt");

  console.log("✅ `refreshjwt` supprimé de IndexedDB et localStorage !");
}




export async function updateRefreshTokenInDB(newRefreshToken: string) {
  if (!newRefreshToken) return;

  console.log("🔍 Sauvegarde du refresh token dans IndexedDB et localStorage...");

  await verifyIndexedDBSetup(); 

  const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");

  await store.put({ key: "refreshToken", value: newRefreshToken });
  await store.put({ key: "refreshTokenExpiration", value: newExpirationTime });

  console.log("✅ Refresh token stocké dans IndexedDB :", newRefreshToken);

  // ✅ Vérifie immédiatement si le token est bien enregistré
  const storedToken = await store.get("refreshToken");
  console.log("📤 Vérification immédiate : Refresh token réellement stocké dans IndexedDB :", storedToken?.value);

  localStorage.setItem("refreshToken", newRefreshToken);
  localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());

  console.log("✅ Nouveau refresh token stocké sur l'app :", newRefreshToken);
}






export async function updateTokens(newJwt: string, newRefreshToken: string) {
  if (!newJwt) return;

  try {
    console.log("🔄 Mise à jour des tokens...");

    sessionStorage.setItem("jwt", newJwt);
    localStorage.setItem("jwt", newJwt);
    localStorage.setItem("refreshToken", newRefreshToken);
    await updateJWTInIndexedDB(newJwt);
    await updateRefreshTokenInDB(newRefreshToken);

    console.log("✅ Refresh token enregistré dans IndexedDB :", newRefreshToken);

    const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
    localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());

    // Stocke dans les cookies
    setTokenCookies(newJwt, newRefreshToken);

    console.log("✅ Tokens mis à jour partout !");
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des tokens :", error);
  }
}




// ✅ Vérifier et rafraîchir immédiatement le JWT si nécessaire au réveil de l'app
export async function checkAndRefreshOnWakeUp() {
  console.log("⏰ Vérification du refresh au réveil...");

  const now = Date.now();
  const lastRefresh = Number(localStorage.getItem("lastRefreshTime")) || 0;

  if (now - lastRefresh < 5 * 60 * 1000) {
    console.log("🛑 Refresh déjà fait récemment, on attend.");
    return;
  }

  let expirationTime = Number(localStorage.getItem("refreshTokenExpiration") || 0);
  
  // 🔄 Corrige une date invalide (ex: 1970)
  if (expirationTime < 10000000000) { 
    console.warn("⚠️ Expiration du refresh token invalide, on le remet à 7 jours");
    expirationTime = now + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("refreshTokenExpiration", expirationTime.toString());
  }

  console.log("🔍 Expiration enregistrée :", new Date(expirationTime).toLocaleString());
  console.log("🕒 Heure actuelle :", new Date(now).toLocaleString());
  console.log("📌 Différence (sec) :", (expirationTime - now) / 1000);

  if (expirationTime - now < 2 * 60 * 1000) {
    console.warn("⏳ Refresh token presque expiré, tentative de refresh...");

    const storedRefreshToken = await getRefreshTokenFromDB() || localStorage.getItem("refreshToken");

    if (!storedRefreshToken) {
      console.warn("❌ Aucun refresh token disponible, arrêt du refresh.");
      return;
    }

    const newJwt = await refreshToken();

    if (!newJwt) {
      console.warn("❌ Échec du refresh token, arrêt.");
      return;
    }

    localStorage.setItem("lastRefreshTime", now.toString());
  } else {
    console.log("✅ Refresh token encore valide.");
  }
}


// ✅ Intercepteur Axios : Rafraîchir et relancer les requêtes en cas d’expiration du JWT
axios.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("🚨 JWT expiré, tentative de refresh...");
      const newJwt = await refreshToken();

      if (newJwt) {
        console.log("🔄 Relancement de la requête avec le nouveau token...");
        error.config.headers['Authorization'] = `Bearer ${newJwt}`;
        return axios(error.config);
      } else {
        console.warn("🚨 Impossible de rafraîchir le token, l'utilisateur doit se reconnecter.");
        await handleRefreshFailure();
      }
    }
    return Promise.reject(error);
  }
);


export async function handleRefreshFailure() {
  console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");
  alert("⚠️ Votre session a expiré, veuillez vous reconnecter.");
  await clearUserData();
  console.warn("🛑 Tokens corrompus détectés, suppression forcée !");

  setTimeout(() => {
      window.location.href = import.meta.env.MODE === "production" ? "/app/login" : "/login";
  }, 500);
  return Promise.reject("Déconnexion forcée, veuillez vous reconnecter.");
  
  // ✅ Redirection immédiate sans variable inutile
  window.location.href = import.meta.env.MODE === "production" ? "/app/login" : "/login";
  
}

async function logout() {
  console.log("🚨 Déconnexion en cours...");

  try {
    // ✅ Appelle la fonction `logoutUser()` pour supprimer les tokens et les cookies
    await logoutUser();

    console.log("✅ Déconnexion réussie, redirection en cours...");

    // ✅ Recharge la page ou redirige
    setTimeout(() => {
      router.push("/login");
    }, 500);
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
  }
}

export function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    console.error("❌ Erreur lors du décodage du JWT :", e);
    return true;
  }
}



// ✅ Vérification au retour en premier plan (important pour iOS et Android)
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 L’application est de retour, vérification du JWT...");

    const jwt = await getToken();
    if (!jwt || isJwtExpired(jwt)) {
      console.warn("🚨 JWT expiré, tentative de rafraîchissement...");
      await refreshToken();
    } else {
      console.log("✅ JWT encore valide !");
    }
  }
});

