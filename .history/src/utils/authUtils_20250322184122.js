import { jwtDecode } from "jwt-decode";
import router from "@/router";
import {
  getValidToken,
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getPrenomFromIndexedDB
} from "@/utils/api.ts";

/**
 * Vérifie la validité du JWT et prépare les données utilisateur.
 * @param {boolean} autoRedirect - Redirige vers /login si le JWT est invalide.
 * @returns {Promise<boolean>} - true si l'utilisateur est authentifié, false sinon.
 */
export async function checkAuth(autoRedirect = true) {
  try {
    console.log("🔄 AuthUtils → Vérification JWT et données...");

    await verifyIndexedDBSetup();
    await restoreTokensIfNeeded();

    const jwt = await getValidToken();
    if (!jwt) {
      console.warn("❌ Aucun JWT valide trouvé.");
      if (autoRedirect) router.push("/login");
      return false;
    }

    const decoded = jwtDecode(jwt);
    if (decoded.exp * 1000 < Date.now()) {
      console.warn("⛔ JWT expiré.");
      sessionStorage.removeItem("jwt");
      localStorage.removeItem("jwt");
      if (autoRedirect) router.push("/login");
      return false;
    }

    // ✅ Sauvegarde du prénom s’il est manquant
    let prenom = localStorage.getItem("prenom") || sessionStorage.getItem("prenom");
    if (!prenom) {
      console.log("🔍 Prénom manquant, tentative via IndexedDB...");
      prenom = await getPrenomFromIndexedDB();
    }

    if (prenom) {
      localStorage.setItem("prenom", prenom);
    } else {
      console.warn("⚠️ Aucun prénom trouvé, utilisation par défaut.");
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur dans checkAuth():", err);
    if (autoRedirect) router.push("/login");
    return false;
  }
}
