import { getJWTFromIndexedDB, updateJWTInIndexedDB, getRefreshTokenFromDB, updateRefreshTokenInDB } from "@/utils/storageService.ts";
import { logoutUser } from "@/utils/api.ts";

export async function getValidToken(): Promise<string | null> {
  console.log("🔍 Vérification des tokens en cours...");

  const storedRefreshToken = await getRefreshTokenFromDB();
  if (!storedRefreshToken) {
    console.warn("❌ Aucun refresh token disponible. Déconnexion forcée.");
    
    localStorage.setItem("session_expired", "true"); // 🛑 Stopper toute tentative de refresh en boucle
    return null; // ✅ Retourne `null` sans tenter de refresh
  }

  let jwt = await getToken();
  if (jwt && !isTokenExpired(jwt)) {
    console.log("✅ JWT valide trouvé !");
    return jwt;
  }

  console.warn("🚨 JWT expiré ou absent, mais on ne tente pas un refresh en boucle !");
  return null; // ✅ Retourne `null` pour empêcher la boucle infinie
}



export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true; // 🚨 Si erreur, on considère le token expiré
  }
}
export async function refreshToken(): Promise<string | null> {
  const storedRefreshToken = await getRefreshTokenFromDB();

  if (!storedRefreshToken) {
    console.warn("❌ Aucun refresh token disponible, impossible de rafraîchir.");
    return null;
  }

  try {
    console.log("🔄 Tentative de rafraîchissement du JWT...");

    const apiUrl = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.ok && data.jwt) {
      console.log("✅ Refresh réussi, nouveau JWT :", data.jwt);
      await updateTokens(data.jwt, storedRefreshToken);
      return data.jwt;
    } else {
      console.error("❌ Refresh échoué !");
      return null;
    }
  } catch (error) {
    console.error("❌ Erreur lors du rafraîchissement du JWT :", error);
    return null;
  }
}
