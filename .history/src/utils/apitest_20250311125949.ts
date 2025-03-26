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
  