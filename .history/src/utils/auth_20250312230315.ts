import { getToken, setToken } from "@/utils/api.ts";
import { openDB } from "idb"; // IndexedDB avec idb
import { useAuthStore } from "@/stores/authStore";
import router from "@/router/index.ts";
import { jwtDecode } from "jwt-decode";

// ✅ Définition des types
interface JWTData {
  email?: string;
  prenom?: string;
  name?: string;
  exp: number;
}

export async function getValidToken(): Promise<string | null> {
  const jwt = await getToken("jwt");
  const authStore = useAuthStore();

  if (jwt && !isTokenExpired(jwt)) {
    console.log("✅ JWT valide trouvé !");
    authStore.setUserToken(jwt);
    authStore.user = getUserInfoFromJWT();
    return jwt;
  }

  console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
  const newJwt = await refreshToken();

  if (newJwt) {
    authStore.setUserToken(newJwt);
    authStore.user = getUserInfoFromJWT();
  }

  return newJwt;
}

// ✅ Gestion du Refresh Token
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;

async function refreshToken(): Promise<string | null> {
  if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
    console.error("❌ Trop de tentatives de refresh échouées. Déconnexion forcée.");
    return forceLogout();
  }

  refreshAttemptCount++;

  const refreshToken = await getToken("refreshToken");
  if (!refreshToken) {
    console.warn("❌ Aucun refresh token, redirection vers login.");
    return forceLogout();
  }

  try {
    const response = await fetch(
      `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec?route=refresh&refreshToken=${refreshToken}`
    );
    const data = await response.json();

    if (!data.jwt) throw new Error("❌ Refresh token invalide.");

    await setToken("jwt", data.jwt);
    console.log("✅ Token rafraîchi !");
    refreshAttemptCount = 0;
    return data.jwt;
  } catch (error) {
    console.error("Échec du refresh :", error);
    return forceLogout();
  }
}

// ✅ Vérification de l’expiration d’un JWT
function isTokenExpired(token: string): boolean {
  try {
    const payload: JWTData = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

// ✅ Redirection vers la page de connexion
function forceLogout(): null {
  console.warn("🔄 Redirection vers login...");
  router.replace("/login");
  return null;
}

// ✅ Récupération des infos utilisateur depuis le JWT
export function getUserInfoFromJWT(): { email: string | null; prenom: string | null } {
  let jwt: string | undefined =
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("jwt") ||
    document.cookie.split("; ").find((row) => row.startsWith("jwt="))?.split("=")[1];

  if (!jwt) {
    console.warn("⚠️ Aucun JWT trouvé !");
    return { email: null, prenom: null };
  }

  try {
    const decoded: JWTData = jwtDecode(jwt);
    return {
      email: decoded.email || null,
      prenom: decoded.prenom || decoded.name || null,
    };
  } catch (error) {
    console.error("❌ Erreur lors du décodage du JWT :", error);
    return { email: null, prenom: null };
  }
}

// ✅ Gestion de IndexedDB pour stocker les tokens
async function getDB() {
  return openDB("AuthDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore");
      }
    },
  });
}

// ✅ Sauvegarde du JWT & Refresh Token dans IndexedDB
export async function saveTokens(jwt: string, refreshToken: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");

  await store.put(jwt, "jwt");
  await store.put(refreshToken, "refreshToken");

  console.log("💾 [IndexedDB] JWT & Refresh Token sauvegardés !");
}
