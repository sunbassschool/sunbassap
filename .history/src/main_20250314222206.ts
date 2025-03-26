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
  openIndexedDB,
  getItemFromStore,
  shouldRefreshJwt,
  checkAndRefreshOnWakeUp,
  verifyIndexedDBSetup, 
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken,
  resetIndexedDB,
  hasUserEverLoggedIn,
  restoreTokensIfNeeded,
  updateTokens 
} from "@/utils/api.ts";

// Global flag pour éviter plusieurs refreshs simultanés
let isRefreshing = false;

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

  // ✅ Démarrer Vue immédiatement pour éviter un écran blanc
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  // ✅ Vérifier et corriger le logo en parallèle
  checkAndFixLogo();

  // ✅ Attendre que IndexedDB soit prête AVANT d’accéder aux tokens
  await initIndexedDB();

  console.log("🔑 Vérification du JWT...");
  const jwt = await getJWTFromIndexedDB();

  if (jwt) {
    console.log("✅ JWT trouvé, l'utilisateur est connecté !");
  } else {
    console.warn("⚠️ Aucun JWT trouvé, redirection vers la page de connexion.");
    router.replace("/login"); // Redirige si aucun JWT trouvé
  }

  // ✅ Masquer l'écran de chargement après l'initialisation complète
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.transition = "opacity 0.5s ease-out";
    loadingScreen.style.opacity = "0";
    setTimeout(() => (loadingScreen.style.display = "none"), 500);
  }
}


async function initIndexedDB() {
  console.log("🔄 Vérification et initialisation d'IndexedDB...");

  try {
    const isReady = await verifyIndexedDBSetup();
    
    if (!isReady) {
      console.warn("⚠️ IndexedDB n'a pas pu être initialisée correctement !");
      return;
    }

    console.log("✅ IndexedDB prête !");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation d'IndexedDB :", error);
  }
}



async function initAuth() {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    const userExists = await hasUserEverLoggedIn();
    console.log(`🧐 Connexion précédente : ${userExists ? "Oui" : "Non"}`);

    if (userExists) {
      if (!localStorage.getItem("fixRefreshDone")) {
        console.log("🛠️ Correction du stockage du refresh token...");
        await fixRefreshTokenStorage();
        localStorage.setItem("fixRefreshDone", "true");
      }

      preventIndexedDBCleanup();
      await syncRefreshToken();
    }

    const jwt = await getToken();
    if (jwt) {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
    } else {
      console.log("🚀 Aucun JWT trouvé, redirection vers login.");
      router.replace("/login");
    }
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
  }
}


// ✅ Vérification des tokens au réveil
let lastVisibilityCheck = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || Date.now() - lastVisibilityCheck < 60_000 || isRefreshing) {
    return;
  }

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens après réveil...");

  try {
    isRefreshing = true;

    const jwt = await getToken();
    const refreshToken = localStorage.getItem("refreshToken");

    if (jwt && refreshToken) {
      console.log("🔄 Mise à jour des tokens après réveil...");
      await updateTokens(jwt, refreshToken);
    } else {
      console.warn("⚠️ Tokens manquants après réveil, tentative de restauration...");
      await restoreTokensIfNeeded();
    }
  } catch (error) {
    console.error("❌ Erreur lors du réveil :", error);
  } finally {
    isRefreshing = false;
  }
});


// ✅ Démarrage de l'application
initApp();
