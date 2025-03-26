import { jwtDecode } from "jwt-decode";
import router from "@/router";
import { getValidToken } from "@/utils/api.ts";

/**
 * Vérifie la validité du JWT.
 * @param {boolean} autoRedirect - Si true, redirige automatiquement vers /login en cas d'échec.
 * @returns {Promise<boolean>} - true si le JWT est valide, false sinon.
 */
export async function checkAuth(autoRedirect = true) {
  try {
    const jwt = await getValidToken();

    if (!jwt) {
      console.warn("❌ Aucun JWT trouvé.");
      if (autoRedirect) router.push("/login");
      return false;
    }

    const decoded = jwtDecode(jwt);
    const isExpired = decoded.exp * 1000 < Date.now();

    if (isExpired) {
      console.warn("🔒 JWT expiré.");
      sessionStorage.removeItem("jwt");
      localStorage.removeItem("jwt");
      if (autoRedirect) router.push("/login");
      return false;
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur dans checkAuth :", err);
    if (autoRedirect) router.push("/login");
    return false;
  }
}
