import { getJWTFromIndexedDB, updateJWTInIndexedDB, getRefreshTokenFromDB, updateRefreshTokenInDB } from "@/services/storageService.ts";
import { logoutUser } from "@/services/authService.ts";

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

  const refreshToken = await getRefreshTokenFromDB();
  if (!refreshToken) {
    console.error("❌ Aucun refresh token disponible, déconnexion.");
    await logoutUser();
    return null;
  }

  try {
    const response = await fetch("/api/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error("Échec du rafraîchissement");

    const { jwt, newRefreshToken } = await response.json();
    await updateJWTInIndexedDB(jwt);
    await updateRefreshTokenInDB(newRefreshToken);

    console.log("✅ Nouveau JWT enregistré !");
    return jwt;
  } catch (error) {
    console.error("❌ Erreur lors du refresh :", error);
    await logoutUser();
    return null;
  }
}
