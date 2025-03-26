declare global {
  interface Window {
      latestJWT?: string;
  }
}

import { openDB } from "idb";
import axios from "axios";
import router from "@/router/index.ts"

let currentRefreshPromise: Promise<string | null> | null = null; // Modifié ici
let refreshAttempts = 0; // 🔄 Compteur de tentatives de refresh
const MAX_REFRESH_ATTEMPTS = 3; // ⛔ Limite anti-boucle

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function getRefreshTokenFromDB() {
  console.log("🔄 Récupération du refresh token...");

  // 🔥 Vérifie d'abord en sessionStorage
  const sessionStoredRefreshToken = sessionStorage.getItem("refreshToken");
  if (sessionStoredRefreshToken) {
    console.log("📦 Refresh token trouvé en sessionStorage :", sessionStoredRefreshToken);
    await syncRefreshTokenStorage(sessionStoredRefreshToken);
    return sessionStoredRefreshToken;
  }

  // 🔍 Vérifie LocalStorage
  const localStorageToken = localStorage.getItem("refreshToken");
  if (localStorageToken) {
    console.log("📦 Refresh token trouvé dans LocalStorage :", localStorageToken);

    // ✅ Restaurer immédiatement dans les autres stockages
    await syncRefreshTokenStorage(localStorageToken);
    return localStorageToken;
  }

  // 🔄 Vérification des autres stockages...
  const storedToken = await checkOtherStorageForRefreshToken();
  return storedToken;
}

/**
 * ✅ Fonction qui restaure le refreshToken dans tous les stockages
 */

async function checkOtherStorageForRefreshToken(): Promise<string | null> {
  // 🔍 Vérifie IndexedDB
  await verifyIndexedDBSetup();
  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const storedRefreshTokenEntry = await store.get("refreshToken");

    if (storedRefreshTokenEntry?.value) {
      console.log("💾 Refresh token trouvé dans IndexedDB :", storedRefreshTokenEntry.value);
      return storedRefreshTokenEntry.value;
    }
  } catch (error) {
    console.error("❌ IndexedDB inaccessible :", error);
  }

  // 🔍 Vérifie les Cookies
  const cookies = document.cookie.split("; ");
  const storedRefreshTokenCookie = cookies.find(row => row.startsWith("refreshToken="));
  if (storedRefreshTokenCookie) {
    const storedRefreshToken = storedRefreshTokenCookie.split("=")[1];
    console.log("🍪 Refresh token trouvé dans les cookies :", storedRefreshToken);
    return storedRefreshToken;
  }

  console.error("🚨 Aucun refresh token trouvé !");
  return null;
}

/**
 * ✅ Fonction qui restaure le refreshToken dans les autres stockages
 */
async function syncRefreshTokenStorage(storedRefreshToken: string) {
  console.log("🔄 Synchronisation du refreshToken dans tous les stockages...");

  // ✅ Restaurer dans IndexedDB
  await updateRefreshTokenInDB(storedRefreshToken);

  // ✅ Restaurer dans SessionStorage
  if (!sessionStorage.getItem("refreshToken")) {
    sessionStorage.setItem("refreshToken", storedRefreshToken);
    console.log("📦 Refresh token restauré dans SessionStorage.");
  }

  // ✅ Restaurer dans les cookies
  const cookies = document.cookie.split("; ").find(row => row.startsWith("refreshToken="));
  if (!cookies) {
    document.cookie = `refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/`;
    console.log("🍪 Refresh token restauré dans les cookies.");
  }
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
  const refreshInterval = /Mobi|Android/i.test(navigator.userAgent) ? 2 * 60 * 1000 : 8 * 60 * 1000;

  setTimeout(async () => {
    console.log("🔄 Vérification du JWT et du refresh token...");

    const refreshTokenExp = await getRefreshTokenExpirationFromDB();
    if (refreshTokenExp - Date.now() < 2 * 60 * 1000) {
      console.warn("🚨 Refresh token bientôt expiré ! Tentative de récupération...");
      await restoreTokensToIndexedDB();
    }

    const newJwt = await refreshToken();
    if (!newJwt) {
      console.error("❌ Refresh échoué, déconnexion en cours...");
      await logoutUser();
    } else {
      console.log("✅ JWT rafraîchi avec succès !");
    }

    scheduleJwtRefresh(); // 🔄 Relancer après exécution
  }, refreshInterval);
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

export async function refreshToken(): Promise<string | null> {
  console.log("🔄 Tentative de rafraîchissement du JWT...");
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
