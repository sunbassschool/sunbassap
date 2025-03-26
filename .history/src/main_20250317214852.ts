import { getValidToken, refreshToken } from "@/utils/authService.ts";

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const jwt = await getValidToken();

  if (!jwt) {
    console.warn("❌ Aucun token valide, mais on évite une redirection immédiate.");
    
    // ⚠️ Ajout d'un timeout pour éviter la boucle infinie
    setTimeout(() => {
      console.warn("🚨 Redirection vers login après 5 secondes...");
      window.location.href = "/login"; // 🔥 Redirection après une pause
    }, 5000);

    return;
  }

  console.log("✅ JWT valide trouvé, application prête !");
}


initApp();
