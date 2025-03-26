import Cookies from "js-cookie";

const TOKEN_KEY = "jwt";
const REFRESH_TOKEN_KEY = "refreshToken";

// ✅ Récupérer le JWT depuis n'importe où
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ||
         sessionStorage.getItem(TOKEN_KEY) ||
         Cookies.get(TOKEN_KEY) || 
         null;
}

// ✅ Récupérer le refresh token
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ||
         sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
         Cookies.get(REFRESH_TOKEN_KEY) || 
         null;
}

// ✅ Vérifier si un JWT est expiré
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

// ✅ Sauvegarder le JWT et le refreshToken
export function saveTokens(jwt: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, jwt);
  sessionStorage.setItem(TOKEN_KEY, jwt);
  Cookies.set(TOKEN_KEY, jwt, { secure: true, sameSite: "Strict", expires: 1 });

  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { secure: true, sameSite: "Strict", expires: 7 });

  console.log("✅ Tokens sauvegardés !");
}

// ✅ Supprimer les tokens (déconnexion)
export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  Cookies.remove(TOKEN_KEY);

  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);

  console.log("🚪 Déconnexion réussie !");
}
