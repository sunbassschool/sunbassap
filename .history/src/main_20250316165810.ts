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
  restoreRefreshToken, 
  getToken,
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


async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  // 🔄 Bloquer la navigation en attendant la restauration
  const appContainer = document.getElementById("app");
  const loadingScreen = document.getElementById("loading-screen");

  if (appContainer) appContainer.style.opacity = "0";
  if (loadingScreen) loadingScreen.style.display = "flex";

  app.mount("#app"); // Monter l'application immédiatement

  checkAndFixLogo(); // ✅ Vérifie si le logo est bien chargé

  // ✅ Protection IndexedDB contre suppression iOS
  await preventIndexedDBCleanup();

  // ✅ Attendre que IndexedDB soit prête avant d’accéder aux tokens
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, récupération impossible !");
    return;
  }

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();
  await restoreTokensToIndexedDBIfMissing();

  const jwt = localStorage.getItem("jwt");
  const refreshToken = localStorage.getItem("refreshToken");

  if (jwt && refreshToken) {
    console.log("✅ JWT et Refresh Token trouvés après restauration, l'utilisateur est connecté !");
  } else if (jwt && !refreshToken) {
    console.warn("⚠️ JWT trouvé mais Refresh Token manquant, tentative de restauration...");
    const restoredRefreshToken = await getRefreshTokenFromDB();

    if (restoredRefreshToken) {
      console.log("✅ Refresh Token restauré !");
      localStorage.setItem("refreshToken", restoredRefreshToken);
    } else {
      console.warn("❌ Impossible de restaurer le Refresh Token, redirection vers login.");
      await router.replace("/login");
      window.location.reload(); // ✅ Force l'UI à se mettre à jour
      return;
    }
  } else {
    console.warn("❌ Aucun JWT trouvé, redirection vers login.");
    await router.replace("/login");
    window.location.reload(); // ✅ Corrige l'affichage de l'UI après redirection
    return;
  }

  // ✅ Stocker les tokens dans les cookies pour plus de fiabilité sous iOS
  setTokenCookies(jwt, refreshToken);

  // ✅ Afficher l'application une fois l'authentification terminée
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
