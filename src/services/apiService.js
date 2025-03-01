import { refreshAuthToken } from "./authService";

export async function apiFetch(url, options = {}) {
  let jwt = localStorage.getItem("jwt");

  if (!options.headers) options.headers = {};
  options.headers["Authorization"] = `Bearer ${jwt}`;

  let response = await fetch(url, options);
  let data = await response.json();

  // 🔄 Si le JWT est expiré, essayer de le rafraîchir
  if (data.message === "JWT invalide ou expiré") {
    console.log("🔄 JWT expiré, tentative de rafraîchissement...");

    const newJwt = await refreshAuthToken();

    if (newJwt) {
      options.headers["Authorization"] = `Bearer ${newJwt}`;
      response = await fetch(url, options);
      data = await response.json();
    } else {
      console.log("❌ Échec du refreshToken, utilisateur déconnecté.");
      localStorage.removeItem("jwt");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login"; // Redirection vers la connexion
    }
  }

  return data;
}
