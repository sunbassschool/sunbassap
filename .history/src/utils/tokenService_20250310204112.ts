import axios from "axios";
import { openDB } from "idb";

const API_BASE_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec";

// ✅ Création de l'instance Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// 🔒 Variables pour éviter les rafraîchissements multiples
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/** ✅ Récupère le JWT stocké */
export async function getToken(): Promise<string | null> {
  return localStorage.getItem("jwt") || sessionStorage.getItem("jwt") || await getJWTFromIndexedDB();
}

/** ✅ Récupère le refreshToken depuis IndexedDB, cookies ou localStorage */
export async function getRefreshTokenFromDB(): Promise<string | null> {
  const cookies = document.cookie.split("; ").find(row => row.startsWith("refreshToken="));
  if (cookies) return cookies.split("=")[1];

  const db = await openDB("AuthDB", 1);
  const tokenEntry = await db.get("authStore", "refreshToken");
  if (tokenEntry?.value) return tokenEntry.value;

  return localStorage.getItem("refreshToken");
}

/** ✅ Stocke le JWT */
export async function setJWT(jwt: string) {
  if (!jwt) return;
  localStorage.setItem("jwt", jwt);
  sessionStorage.setItem("jwt", jwt);

  const db = await openDB("AuthDB", 1);
  await db.put("authStore", { key: "jwt", value: jwt });
}

/** ✅ Supprime le JWT */
export async function clearJWT() {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");

  const db = await openDB("AuthDB", 1);
  await db.delete("authStore", "jwt");
}

/** ✅ Rafraîchit le JWT en utilisant le refreshToken */
export async function refreshToken(): Promise<string | null> {
  if (isRefreshing) return refreshPromise!;
  
  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshToken = await getRefreshTokenFromDB();
    if (!refreshToken) {
      console.warn("🚨 Aucun refresh token trouvé.");
      return null;
    }

    try {
      const response = await api.get(`?route=refresh&refreshtoken=${encodeURIComponent(refreshToken)}`);
      if (response.data.status === "success" && response.data.data?.jwt) {
        await setJWT(response.data.data.jwt);
        return response.data.data.jwt;
      } else {
        throw new Error("Réponse API invalide");
      }
    } catch (error) {
      console.error("❌ Erreur lors du refresh :", error);
      await handleRefreshFailure();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** ✅ Vérifie si un JWT est expiré */
export function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    console.error("❌ Erreur lors du décodage du JWT :", e);
    return true;
  }
}

/** ✅ Supprime le refreshToken */
export async function clearRefreshToken() {
  localStorage.removeItem("refreshToken");
  document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

  const db = await openDB("AuthDB", 1);
  await db.delete("authStore", "refreshToken");
}

/** ✅ Gère l'échec du refresh token */
export async function handleRefreshFailure() {
  console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");
  alert("⚠️ Votre session a expiré, veuillez vous reconnecter.");

  await clearJWT();
  await clearRefreshToken();
  window.location.href = "/login";
}

/** ✅ Intercepteur pour attacher le JWT aux requêtes */
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

/** ✅ Intercepteur pour gérer les erreurs 401 */
api.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("🚨 JWT expiré, tentative de refresh...");

      const newJwt = await refreshToken();
      if (newJwt) {
        error.config.headers.Authorization = `Bearer ${newJwt}`;
        return api(error.config);
      } else {
        console.warn("🚨 Impossible de rafraîchir le token, déconnexion...");
        await handleRefreshFailure();
      }
    }
    return Promise.reject(error);
  }
);

/** ✅ Vérifie et rafraîchit le JWT si nécessaire */
export async function checkAndRefreshJWT() {
  console.log("🔄 Vérification du JWT...");

  const token = await getToken();
  if (!token || isJwtExpired(token)) {
    console.warn("🚨 Pas de JWT valide, tentative de rafraîchissement...");
    await refreshToken();
  }
}

/** ✅ Vérifie le JWT au retour d’arrière-plan */
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 L’application est de retour, vérification du JWT...");
    await checkAndRefreshJWT();
  }
});

/** ✅ Déconnecte proprement l'utilisateur */
export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  await clearJWT();
  await clearRefreshToken();
  window.location.href = "/login";
}

export default api;
