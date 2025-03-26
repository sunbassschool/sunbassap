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

import { jwtDecode } from "jwt-decode"; // ✅ Correct pour Vite et ES Modules


import { createApp } from "vue";
import { createPinia } from "pinia";
import { router } from "@/router";
import { jwtDecode } from "jwt-decode";
import { refreshToken as refreshTokenAPI } from "@/api"; // ✅ Vérifie bien l'import
import { getStoredJWT } from "@/utils/auth";
import { verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/db";

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  let isAuthReady = false;

  const appContainer = document.getElementById("app");
  if (appContainer) appContainer.style.opacity = "0";

  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) loadingScreen.style.display = "flex";

  app.mount("#app");
  checkAndFixLogo();

  // ✅ Vérifier IndexedDB avant d’accéder aux tokens
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, récupération impossible !");
    return;
  }

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  let jwt = await getStoredJWT();
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // ✅ Vérifier si le JWT est expiré
  if (jwt) {
    try {
      const decoded = jwtDecode(jwt);
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < now) {
        console.warn("⚠️ JWT expiré !");
        jwt = null;
      }
    } catch (error) {
      console.error("❌ Erreur lors du décodage du JWT :", error);
      jwt = null;
    }
  }

  // 🔄 Rafraîchir le token si nécessaire
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");

    try {
      // ✅ Vérification du type de refreshToken avant l'appel
      if (typeof refreshTokenAPI !== "function") {
        throw new Error("refreshToken n'est pas une fonction valide !");
      }

      const newJwt = await refreshTokenAPI(); // ✅ Forcément une fonction maintenant
      if (newJwt) {
        localStorage.setItem("jwt", newJwt);
        sessionStorage.setItem("jwt", newJwt);
        console.log("✅ Nouveau JWT récupéré !");
        jwt = newJwt;
      } else {
        console.warn("⚠️ Refresh token invalide !");
        storedRefreshToken = null;
      }
    } catch (error) {
      console.error("❌ Erreur lors du rafraîchissement du token :", error);
      storedRefreshToken = null;
    }
  }

  if (jwt) {
    console.log("✅ JWT valide, l'utilisateur est connecté !");
    isAuthReady = true;
  } else {
    console.warn("⚠️ Aucun JWT valide trouvé, redirection vers login.");
    clearAuthTokens();
    router.replace("/login");
  }

  // ✅ Affichage progressif de l'application
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }

    if (appContainer) {
      appContainer.style.transition = "opacity 0.5s ease-out";
      appContainer.style.opacity = "1";
    }
  }, 500);
}

// ✅ Fonction pour nettoyer les tokens en cas d'échec
function clearAuthTokens() {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
  document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshToken");
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
      router.replace("/login");
    }
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
  }
}


// ✅ Démarrage de l'application
initApp();
