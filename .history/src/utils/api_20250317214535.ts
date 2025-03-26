import { getValidToken, refreshToken } from "@/utils/authService.ts";
import { openDB } from "idb"; // 📌 Assure-toi d'avoir "idb" installé
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
export async function clearIndexedDBData() {
  if (!window.indexedDB) {
    console.warn("⚠️ IndexedDB non supporté sur ce navigateur.");
    return;
  }

  try {
    const db = await openDB("AuthDB", 1);

    // Vérifie si le store "authStore" existe
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("⚠️ IndexedDB 'authStore' introuvable, aucune donnée à nettoyer.");
      return;
    }

    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.clear(); // Efface toutes les données dans le store
    await tx.done; // 🔥 Assure la fermeture propre de la transaction

    console.log("✅ IndexedDB nettoyée !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de IndexedDB :", error);
  }
}