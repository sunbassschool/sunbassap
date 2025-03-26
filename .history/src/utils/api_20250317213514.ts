import { getValidToken, refreshToken } from "@/services/authService.ts";

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let jwt = await getValidToken(); // ✅ Récupère le JWT valide ou tente un refresh

  if (!jwt) {
    console.error("❌ Aucun token valide, déconnexion forcée.");
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${jwt}`);

  console.log(`📡 [API] Requête envoyée : ${url}`);

  let response = await fetch(url, { ...options, headers });

  // 🔄 Gestion automatique du refresh si l’API retourne 401
  if (response.status === 401) {
    console.warn("⚠️ JWT expiré, tentative de rafraîchissement...");

    jwt = await refreshToken(); // 🔄 Tentative de refresh
    if (!jwt) {
      console.error("❌ Impossible de rafraîchir le token. Déconnexion.");
      throw new Error("Session expirée.");
    }

    headers.set("Authorization", `Bearer ${jwt}`);
    response = await fetch(url, { ...options, headers }); // 🔄 Répète la requête avec le nouveau token
  }

  return response;
}
