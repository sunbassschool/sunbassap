import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { refreshToken } from "@/utils/api.ts"; // Vérifie bien ce chemin !

import { 
  scheduleJwtRefresh,
  restoreRefreshToken, 
  getToken,
  getStoredJWT,
  openIndexedDB,
  getItemFromStore,
  shouldRefreshJwt,
  checkAndRefreshOnWakeUp,
  verifyIndexedDBSetup, 
  getJWTFromIndexedDB,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage,
  restoreTokensToIndexedDB, 
  syncRefreshToken,
  resetIndexedDB,
  hasUserEverLoggedIn,
  handleRefreshToken,
  restoreTokensIfNeeded,
  restoreAllTokens,
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

import { jwtDecode } from "jwt-decode"; // ✅ Correct pour Vite et ES Modules


async function initApp() {



async function hideLoadingScreen() {
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
  }, 500);
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

    // 🔥 AJOUT : Forcer la restauration des tokens
    console.log("🔄 Tentative de restauration des tokens depuis IndexedDB...");
    await restoreTokensToIndexedDB();

    // 🔄 Vérifier que les tokens sont bien stockés après restauration
    const jwt = await getToken();
    const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    if (jwt && refreshToken) {
      console.log("✅ JWT et Refresh Token restaurés avec succès !");
      console.log("🔄 Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
    } else {
      console.warn("⚠️ JWT ou Refresh Token manquant après restauration !");
      await router.replace("/login");
      hideLoadingScreen(); // ✅ Masque le spinner après la redirection
    }
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
  }
}


// ✅ Démarrage de l'application
initApp();
