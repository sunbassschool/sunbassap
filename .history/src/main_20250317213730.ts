import { getValidToken, refreshToken } from "@/utils/authService.ts";

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("❌ Aucun token valide, redirection vers login.");
    window.location.href = "/login";
  } else {
    console.log("✅ Authentification validée !");
  }
}

initApp();
