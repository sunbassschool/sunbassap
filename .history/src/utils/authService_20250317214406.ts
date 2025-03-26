import { getJWTFromIndexedDB, updateJWTInIndexedDB, getRefreshTokenFromDB, updateRefreshTokenInDB } from "@/utils/storageService.ts";
import { logoutUser } from "@/utils/api.ts";

export async function getValidToken(): Promise<string | null> {
  let jwt = await getJWTFromIndexedDB();

  if (jwt && !isTokenExpired(jwt)) {
    return jwt; // ✅ JWT valide
  }

  console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
  return await refreshToken();
}

export async function refreshToken(): Promise<string | null> {
  console.log("🔄 Tentative de rafraîchissement du JWT...");

  const storedRefreshToken = await getRefreshTokenFromDB();
  if (!storedRefreshToken) {
    console.error("❌ Aucun refresh token disponible, déconnexion.");
    await logoutUser();
    return null;
  }

  // 🔗 Construction de l'URL API avec les paramètres nécessaires
  const refreshUrl = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;

  try {
    const response = await fetch(refreshUrl, { method: "GET" });

    if (!response.ok) {
      console.error("❌ Échec du rafraîchissement. Code :", response.status);
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    if (!data.jwt || !data.refreshToken) {
      console.error("❌ Réponse API invalide :", data);
      throw new Error("Réponse API invalide");
    }

    // 🔄 Mise à jour des tokens partout
    await updateJWTInIndexedDB(data.jwt);
    await updateRefreshTokenInDB(data.refreshToken);

    console.log("✅ Nouveau JWT récupéré :", data.jwt);
    return data.jwt;
  } catch (error) {
    console.error("❌ Erreur lors du refresh :", error);
    await logoutUser();
    return null;
  }
}
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true; // 🚨 Si erreur, on considère le token expiré
  }
}
