import { openDB } from "idb";
import { jwtDecode } from "jwt-decode";
import type { UserInfo } from "@/utils/types";
import Cookies from "js-cookie";
import axios from "axios";
import router from "@/router/index.ts";

declare global {
  interface Window {
    latestJWT?: string;
    jwtRefreshScheduled?: boolean;
  }
}

let refreshInProgress: Promise<string | null> | null = null;
let resolvePromise: ((value: string | null) => void) | null = null;

// Fonction de gestion des erreurs centralisée
function handleError(error: unknown, message: string): string {
  console.error(`❌ ${message}:`, error);
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inconnue est survenue.";
}

// Gestion centralisée des stockages (avec maintien du JWT dans localStorage)
const storageManager = {
  async getToken(key: string): Promise<string | null> {
    if (key === "jwt") {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    }

    const storedToken = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (storedToken) return storedToken;

    try {
      const dbToken = await getFromIndexedDB(key);
      if (dbToken) return dbToken;
    } catch (error) {
      handleError(error, "Erreur lors de la récupération depuis IndexedDB");
    }

    const cookieToken = Cookies.get(key) || null;
    return cookieToken;
  },

  setToken(key: string, token: string): void {
    if (key === "jwt") {
      localStorage.setItem(key, token);
      sessionStorage.setItem(key, token);
    } else {
      sessionStorage.setItem(key, token);
      localStorage.setItem(key, token);
      Cookies.set(key, token, { secure: true, sameSite: "Strict", expires: 7 });
    }
    console.log(`✅ Token "${key}" mis à jour dans tous les stockages.`);
  },

  removeToken(key: string): void {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    Cookies.remove(key);
    console.log(`️ Token "${key}" supprimé de tous les stockages.`);
  },
};

// Fonction pour récupérer le JWT depuis IndexedDB
export async function getJWTFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openDB("AuthDB", 1);
    const result = await db.get("authStore", "jwt");
    return result?.value ?? null;
  } catch (error) {
    handleError(error, "Erreur lors de l'accès à IndexedDB");
    return null;
  }
}

// Fonction pour récupérer une valeur dans IndexedDB
export async function getFromIndexedDB(key: string): Promise<any> {
  try {
    const db = await openDB("AuthDB", 1);
    const result = await db.get("authStore", key);
    return result?.value ?? null;
  } catch (error) {
    handleError(error, "Erreur lors de la récupération depuis IndexedDB");
    return null;
  }
}

// Fonction pour sauvegarder une valeur dans IndexedDB
export async function saveToIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openDB("AuthDB", 1);
    await db.put("authStore", { value }, key);
  } catch (error) {
    handleError(error, "Erreur lors de la sauvegarde dans IndexedDB");
  }
}

// Fonction pour obtenir un JWT valide
export async function getValidToken(): Promise<string | null> {
  console.log(" Vérification des tokens en cours...");

  let jwt = await storageManager.getToken("jwt");
  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide trouvé.");
    return jwt;
  }

  console.warn(" JWT expiré ou absent, tentative de refresh...");

  try {
    const newJwt = await refreshToken();
    if (newJwt) {
      console.log("✅ Refresh réussi, nouveau JWT obtenu.");
      storageManager.setToken("jwt", newJwt);
      return newJwt;
    } else {
      console.error("❌ Refresh échoué, JWT non récupéré !");
      return null;
    }
  } catch (error) {
    handleError(error, "Erreur lors du rafraîchissement du JWT");
    return null;
  }
}

// Fonction pour vérifier si le JWT a expiré
export function isJwtExpired(token: string | null): boolean {
  if (!token) {
    console.warn("⚠️ [isJwtExpired] Aucun token fourni (null/undefined).");
    return true;
  }

  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    handleError(error, "Erreur lors du décodage du JWT");
    return true;
  }
}

// Fonction pour obtenir le rôle de l'utilisateur à partir du JWT
export function getUserRole(): string | null {
  const token = storageManager.getToken("jwt");

  if (!token) {
    console.warn("❌ Aucun JWT trouvé, l'utilisateur n'est pas authentifié.");
    return null;
  }

  try {
    const decoded: any = jwtDecode(token);
    return decoded.role || null;
  } catch (error) {
    handleError(error, "Erreur lors du décodage du JWT");
    return null;
  }
}

// Fonction pour obtenir le refreshToken depuis IndexedDB
export async function getRefreshTokenFromDB(): Promise<string | null> {
  try {
    const db = await openDB("AuthDB", 1);
    const result = await db.get("authStore", "refreshToken");
    return result?.value ?? null;
  } catch (error) {
    handleError(error, "Erreur lors de la récupération du refreshToken depuis IndexedDB");
    return null;
  }
}

// Fonction pour restaurer les tokens dans IndexedDB si manquant
export async function restoreTokensToIndexedDBIfMissing(): Promise<void> {
  console.log(" Vérification et restauration des tokens dans IndexedDB...");

  try {
    const db = await openDB("AuthDB", 1);
    const jwtInDB = await getFromIndexedDB("jwt");
    const refreshTokenInDB = await getFromIndexedDB("refreshToken");

    if (jwtInDB && refreshTokenInDB) {
      console.log("✅ IndexedDB contient déjà les tokens, aucune restauration nécessaire.");
      return;
    }

    let jwt = await storageManager.getToken("jwt");
    let refreshToken = await storageManager.getToken("refreshToken");

    if (jwt && refreshToken) {
      console.log(" Restauration des tokens dans IndexedDB...");
      await saveToIndexedDB("jwt", jwt);
      await saveToIndexedDB("refreshToken", refreshToken);
      console.log("✅ Tokens restaurés dans IndexedDB !");
    } else {
      console.warn("⚠️ Aucun token valide trouvé pour restauration.");
    }
  } catch (error) {
    handleError(error, "Erreur lors de la restauration des tokens en IndexedDB");
  }
}

// Fonction pour vérifier et restaurer les tokens
export async function checkAndRestoreTokens(): Promise<"valid" | "expired" | "unauthenticated"> {
  console.log(" Vérification des tokens...");

  if (localStorage.getItem("session_expired") === "true") {
    console.warn(" Session marquée comme expirée, arrêt de la récupération des tokens.");
    return "expired";
  }

  let refreshToken = await getRefreshTokenFromDB();
  if (!refreshToken) {
    console.warn("⚠️ Aucun refreshToken trouvé, vérification du JWT...");
    const jwt = await getValidToken();
    if (jwt && !isJwtExpired(jwt)) {
      console.log("✅ JWT encore valide, utilisateur toujours authentifié.");
      return "valid";
    }
    console.warn("❌ Aucun JWT valide trouvé, l'utilisateur n'a jamais été authentifié.");
    return "unauthenticated";
  }

  if (!Cookies.get("refreshToken")) {
    Cookies.set("refreshToken", refreshToken, {
      Cookies.set("refreshToken", refreshToken, { secure: true, sameSite: "Strict", expires: 7 });
  }

  try {
    const response = await axios.post("/refresh-token", { refreshToken });
    const newJwt = response.data.jwt;

    storageManager.setToken("jwt", newJwt);
    storageManager.setToken("refreshToken", response.data.refreshToken);

    console.log("✅ Tokens rafraîchis avec succès !");
    return "valid";
  } catch (refreshError) {
    handleError(refreshError, "Erreur lors du rafraîchissement des tokens");
    console.warn("❌ Rafraîchissement des tokens impossible, l'utilisateur doit se reconnecter.");
    return "expired";
  }
}

// Fonction pour rafraîchir le JWT
async function refreshToken(): Promise<string | null> {
  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = new Promise(async (resolve) => {
    resolvePromise = resolve;

    try {
      const refreshToken = await getRefreshTokenFromDB();
      if (!refreshToken) {
        console.error("❌ Aucun refreshToken trouvé, impossible de rafraîchir le JWT.");
        resolve(null);
        return;
      }

      const response = await axios.post("/refresh-token", { refreshToken });
      const newJwt = response.data.jwt;

      storageManager.setToken("jwt", newJwt);
      storageManager.setToken("refreshToken", response.data.refreshToken);

      console.log("✅ JWT rafraîchi avec succès !");
      resolve(newJwt);
    } catch (refreshError) {
      handleError(refreshError, "Erreur lors du rafraîchissement du JWT");
      resolve(null);
    } finally {
      refreshInProgress = null;
      resolvePromise = null;
    }
  });

  return refreshInProgress;
}

// Fonction pour récupérer les informations de l'utilisateur à partir du JWT
export function getUserInfo(): UserInfo | null {
  const token = storageManager.getToken("jwt");

  if (!token) {
    console.warn("❌ Aucun JWT trouvé, utilisateur non authentifié.");
    return null;
  }

  try {
    const decoded: any = jwtDecode(token);
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      // ... d'autres informations utilisateur
    };
  } catch (error) {
    handleError(error, "Erreur lors du décodage du JWT");
    return null;
  }
}

// Exemple d'utilisation
async function exampleUsage() {
  const validToken = await getValidToken();
  if (validToken) {
    console.log("Token valide :", validToken);
    const userRole = getUserRole();
    if (userRole) {
      console.log("Rôle de l'utilisateur :", userRole);
    }
    const userInfo = getUserInfo();
    if (userInfo) {
      console.log("Informations utilisateur :", userInfo);
    }
  } else {
    console.warn("Aucun token valide trouvé.");
  }
}

exampleUsage();