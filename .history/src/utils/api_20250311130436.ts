declare global {
    interface Window {
      latestJWT?: string;
    }
  }
  
  import { openDB } from "idb";
  import axios from "axios";
  import router from "@/router/index.ts"
  
  let refreshAttempts = 0; // Compteur de tentatives de refresh
  const MAX_REFRESH_ATTEMPTS = 3; // Limite anti-boucle
  let isSyncing = false; // Verrou global pour éviter les boucles infinies
  
  // Fonction centralisée pour interagir avec les différents stockages (localStorage, sessionStorage, cookies, IndexedDB)
  const storageManager = {
    async getTokenFromAllStorages(key: string): Promise<string | null> {
      const storedToken = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (storedToken) return storedToken;
  
      const dbToken = await getTokenFromIndexedDB(key);  // À définir plus tard
      if (dbToken) return dbToken;
  
      const cookieToken = document.cookie.split("; ").find(row => row.startsWith(`${key}=`))?.split("=")[1];
      return cookieToken || null;
    },
  
    setTokenInAllStorages(key: string, token: string) {
      sessionStorage.setItem(key, token);
      localStorage.setItem(key, token);
      document.cookie = `${key}=${token}; Secure; SameSite=Strict; path=/`;
      console.log(`📦 Token "${key}" mis à jour dans tous les stockages`);
    },
  
    removeTokenFromAllStorages(key: string) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      console.log(`🗑️ Token "${key}" supprimé de tous les stockages`);
    }
  };
  
  export async function getRefreshTokenFromDB() {
    console.log("🔄 Récupération du refresh token...");
    let refreshToken = await storageManager.getTokenFromAllStorages("refreshToken");
    if (!refreshToken) {
      console.error("🚨 Aucun refresh token trouvé !");
    }
    return refreshToken;
  }
  // Fonction de rafraîchissement du JWT
export async function refreshToken(): Promise<string> {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.warn("⛔ Trop de tentatives de refresh, on arrête.");
      await handleRefreshFailure();
      return ""; // Retourne une chaîne vide pour indiquer l'échec
    }
  
    console.log("🔄 Tentative de rafraîchissement du JWT...");
  
    let storedRefreshToken = await getRefreshTokenFromDB();
    if (!storedRefreshToken) {
      console.warn("⚠️ Aucun refresh token disponible.");
      await handleRefreshFailure();
      return "";
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
      return "";
    }
  }
  // Fonction pour mettre à jour les tokens dans tous les stockages
export async function updateTokens(newJwt: string, newRefreshToken: string) {
    if (!newJwt || !newRefreshToken) return;
  
    console.log("🔄 Mise à jour des tokens...");
  
    // Mettre à jour les tokens dans tous les stockages
    storageManager.setTokenInAllStorages("jwt", newJwt);
    storageManager.setTokenInAllStorages("refreshToken", newRefreshToken);
  
    const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
    localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());
  
    // Enregistrer dans IndexedDB
    await updateJWTInIndexedDB(newJwt);
    await updateRefreshTokenInDB(newRefreshToken);
  
    console.log("✅ Tokens mis à jour partout !");
  }
  
  // Mise à jour du JWT dans IndexedDB
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
  
  // Mise à jour du refresh token dans IndexedDB
  export async function updateRefreshTokenInDB(newRefreshToken: string) {
    if (!newRefreshToken) return;
  
    console.log("🔍 Sauvegarde du refresh token dans IndexedDB...");
  
    await verifyIndexedDBSetup(); 
  
    const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
  
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
  
    await store.put({ key: "refreshToken", value: newRefreshToken });
    await store.put({ key: "refreshTokenExpiration", value: newExpirationTime });
  
    console.log("✅ Refresh token stocké dans IndexedDB :", newRefreshToken);
  
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());
    sessionStorage.setItem("refreshToken", newRefreshToken);
  
    console.log("✅ Nouveau refresh token stocké sur l'app :", newRefreshToken);
  }
  // Fonction pour gérer l’échec de rafraîchissement du token
export async function handleRefreshFailure() {
    console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");
    alert("⚠️ Votre session a expiré, veuillez vous reconnecter.");
    await clearUserData();
    console.warn("🛑 Tokens corrompus détectés, suppression forcée !");
  
    setTimeout(() => {
      window.location.href = import.meta.env.MODE === "production" ? "/app/login" : "/login";
    }, 500);
    return Promise.reject("Déconnexion forcée, veuillez vous reconnecter.");
  }
  
  // Nettoyage complet des données utilisateur
  export async function clearUserData() {
    console.log("🧹 Nettoyage complet des données utilisateur...");
  
    // Supprimer toutes les données utilisateur dans localStorage
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
  
    // Supprime toutes les données de sessionStorage
    try {
      sessionStorage.clear();
      console.log("🗑️ sessionStorage vidé !");
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage de sessionStorage :", error);
    }
  
    // Suppression ciblée dans IndexedDB
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
  // Vérifie et rafraîchit le JWT si nécessaire
export async function checkAndRefreshJWT() {
  await syncRefreshToken(); // Synchronisation avant de vérifier le JWT

  // Vérifie si le refresh token est disponible dans tous les stockages
  let storedRefreshToken = await getRefreshTokenFromDB();
  if (storedRefreshToken) {
    console.log("🔄 Vérification et restauration des autres stockages...");

    // Restaurer dans localStorage, sessionStorage, cookies si nécessaire
    if (!localStorage.getItem("refreshToken")) {
      storageManager.setTokenInAllStorages("refreshToken", storedRefreshToken);
      console.log("📦 Refresh token restauré dans LocalStorage.");
    }

    if (!sessionStorage.getItem("refreshToken")) {
      storageManager.setTokenInAllStorages("refreshToken", storedRefreshToken);
      console.log("📦 Refresh token restauré dans SessionStorage.");
    }

    const cookies = document.cookie.split("; ").find(row => row.startsWith("refreshToken="));
    if (!cookies) {
      document.cookie = `refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/`;
      console.log("🍪 Refresh token restauré dans les cookies.");
    }
  }

  const token = await getToken();
  if (!token || isJwtExpired(token)) {
    console.warn("🚨 Pas de JWT valide, tentative de rafraîchissement...");

    // Cherche le refreshToken dans cookies, IndexedDB et LocalStorage
    let storedRefreshToken = await getRefreshTokenFromDB();

    if (!storedRefreshToken) {
      console.error("❌ Aucun refresh token disponible, déconnexion...");
      await logoutUser();
      return;
    }

    await refreshToken(); // Rafraîchit le JWT
    return;
  }

  try {
    const decoded = JSON.parse(atob(token.split(".")[1])); // Vérifie si le JWT est bien décodable
    console.log(`⏳ JWT expire à : ${new Date(decoded.exp * 1000).toLocaleString()}`);
  } catch (e) {
    console.error("❌ JWT corrompu, forçage de déconnexion.");
    await logout();
  }
}
