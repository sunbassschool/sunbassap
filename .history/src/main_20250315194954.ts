import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { 
  scheduleJwtRefresh, 
  getToken,
  verifyIndexedDBSetup, 
  restoreTokensIfNeeded 
} from "@/utils/api.ts";

// ✅ Variable globale pour suivre l'état de l'authentification
export let isAuthReady = false;

// ✅ Fonction pour vérifier et corriger le logo
function checkAndFixLogo() {
  console.log("🔍 Vérification du logo...");

  const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
  if (!logoElement) return;

  const baseUrl = import.meta.env.VITE_BASE_URL || "/";
  const newLogoPath = `${baseUrl}images/logo.png`;

  logoElement.onerror = () => {
    console.warn("⚠️ Logo introuvable, mise à jour...");
    logoElement.src = newLogoPath;
  };
}

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  checkAndFixLogo();

  // ✅ Vérifier IndexedDB avant d'accéder aux tokens
  console.log("🔄 Vérification IndexedDB...");
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête !");
    return;
  }

  // ✅ Restauration des tokens avant de marquer l'auth comme prête
  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  const jwt = localStorage.getItem("jwt");
  isAuthReady = true; // 🚀 Authentification prête

  if (jwt) {
    console.log("✅ JWT trouvé après restauration, l'utilisateur est connecté !");
  } else {
    console.warn("⚠️ Aucun JWT trouvé, redirection vers login.");
    router.replace("/login");
  }
}

// ✅ Démarrage de l'application
initApp();
