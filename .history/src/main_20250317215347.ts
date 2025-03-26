import { getValidToken, refreshToken } from "@/utils/authService.ts";

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  if (localStorage.getItem("session_expired") === "true") {
    console.warn("🚨 La session est expirée. Redirection vers login.");
    window.location.href = "/login"; // ✅ Redirection immédiate
    return;
  }

  const token = await getValidToken();

  if (!token) {
    console.warn("❌ Aucun token valide, redirection forcée.");
    localStorage.setItem("session_expired", "true"); // 🚨 Marquer l'expiration pour éviter le reboot
    window.location.href = "/login"; // ✅ Redirection définitive
    return;
  }

  console.log("✅ JWT valide, lancement de l'application !");
}

initApp();
