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
  