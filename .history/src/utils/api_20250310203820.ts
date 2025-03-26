import axios from "axios";
import { 
  getToken, 
  setJWT, 
  refreshToken, 
  clearJWT, 
  clearRefreshToken, 
  getRefreshTokenFromDB 
} from "@/utils/tokenService.ts";

const API_BASE_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec";

// ✅ Création de l'instance Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// 🔒 Variables de verrouillage pour éviter les rafraîchissements multiples
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// ✅ Intercepteur pour attacher automatiquement le JWT à chaque requête
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// ✅ Intercepteur pour gérer automatiquement les erreurs 401 et rafraîchir le JWT
api.interceptors.response.use(
  response => response, // ✅ Si la réponse est OK, on la retourne directement
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("🚨 JWT expiré, tentative de refresh...");

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newJwt = await refreshPromise;
      if (newJwt) {
        console.log("🔄 Relancement de la requête avec le nouveau token...");
        error.config.headers.Authorization = `Bearer ${newJwt}`;
        return api(error.config);
      } else {
        console.warn("🚨 Impossible de rafraîchir le token, déconnexion...");
        await clearJWT();
        await clearRefreshToken();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * 🔄 Rafraîchit le token si nécessaire avant d'effectuer une requête sécurisée
 * @returns {Promise<void>}
 */
export async function checkAndRefreshJWT() {
  console.log("🔄 Vérification et rafraîchissement du JWT...");
  
  const token = await getToken();
  if (!token || isJwtExpired(token)) {
    console.warn("🚨 Pas de JWT valide, tentative de rafraîchissement...");

    let storedRefreshToken = await getRefreshTokenFromDB();
    if (!storedRefreshToken) {
      console.error("❌ Aucun refresh token disponible, déconnexion...");
      await handleRefreshFailure();
      return;
    }

    await refreshToken();
  } else {
    console.log("✅ JWT encore valide.");
  }
}

/**
 * 🚨 Déconnecte l'utilisateur proprement
 */
export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  try {
    await clearJWT();
    await clearRefreshToken();
    window.dispatchEvent(new Event("logout"));

    console.log("✅ Redirection vers la page de connexion...");
    window.location.href = "/login";
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
  }
}

/**
 * 🚨 Gère l'échec du rafraîchissement du token
 */
export async function handleRefreshFailure() {
  console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");
  alert("⚠️ Votre session a expiré, veuillez vous reconnecter.");

  await logoutUser();
}

/**
 * 🕒 Vérifie si un JWT est expiré
 * @param {string} token - JWT à vérifier
 * @returns {boolean} True si expiré, False sinon
 */
export function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    console.error("❌ Erreur lors du décodage du JWT :", e);
    return true;
  }
}

/**
 * ✅ Vérifie le refresh token au retour en premier plan (iOS & Android)
 */
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 L’application est de retour, vérification du JWT...");
    await checkAndRefreshJWT();
  }
});

export default api;
