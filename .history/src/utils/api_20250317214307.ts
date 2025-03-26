import { getValidToken, refreshToken } from "@//authService.ts";

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
export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  try {
    // ✅ Marquer la session comme expirée
    localStorage.setItem("session_expired", "true");

    // ✅ Supprimer les tokens et les données utilisateur
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("refreshToken");

    // ✅ Nettoyage IndexedDB
    await clearIndexedDBData();

    // ✅ Suppression des cookies (JWT & refreshToken)
    document.cookie = "jwt=; path=/; max-age=0";
    document.cookie = "refreshToken=; path=/; max-age=0";
    
    // ✅ Informer l’application que l’utilisateur est déconnecté
    window.dispatchEvent(new Event("logout"));

    // ✅ Rediriger vers la page de connexion après un court délai
    setTimeout(() => {
      console.log("🔄 Redirection vers /login...");
      router.replace("/login"); // 🔥 Redirection sans recharger la page
    }, 1000);

  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
  }
}