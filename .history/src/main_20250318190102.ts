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

function clearAuthData() {
  console.warn("🧹 Suppression des tokens et session de l'utilisateur...");
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
  document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshToken");
}

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  try {
    const app = createApp(App);
    app.use(createPinia());
    app.use(router);

    let isAuthReady = false;

    const appContainer = document.getElementById("app");
    if (appContainer) appContainer.style.opacity = "0";

    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) loadingScreen.style.display = "flex";

    app.mount("#app");

    // ✅ Vérification et restauration des tokens
    console.log("🔄 Tentative de restauration complète des tokens...");
    await restoreAllTokens();

    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête, récupération impossible !");
      throw new Error("IndexedDB inaccessible");
    }

    console.log("🔄 Restauration des tokens en cours...");
    await restoreTokensIfNeeded();

    let jwt = await getStoredJWT();
    let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    // ✅ Vérification de l'expiration du JWT
    if (jwt) {
      try {
        const decoded = jwtDecode(jwt);
        const now = Math.floor(Date.now() / 1000);

        if (decoded.exp && decoded.exp < now) {
          console.warn("⚠️ JWT expiré !");
          jwt = null;  // On invalide le JWT expiré
        }
      } catch (error) {
        console.error("❌ Erreur lors du décodage du JWT :", error);
        jwt = null;
      }
    }

    // ✅ Tentative de refresh si nécessaire
    if (!jwt && storedRefreshToken) {
      console.log("🔄 Tentative de rafraîchissement du token...");
      await handleRefreshToken();
      jwt = await getStoredJWT(); // Vérifier si le refresh a fonctionné
    }

    if (jwt) {
      console.log("✅ JWT valide, l'utilisateur est connecté !");
      isAuthReady = true;
    } else {
      console.warn("⚠️ Aucun JWT valide trouvé, redirection vers login.");
      clearAuthData();
      router.replace("/login");
    }

    // ✅ Masquage de l'écran de chargement UNIQUEMENT si tout est prêt
    finalizeLoadingScreen();
  } catch (error) {
    console.error("❌ Erreur critique lors de l'initialisation de l'application :", error);
    clearAuthData();
    router.replace("/login");
    finalizeLoadingScreen();
  }
}




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
