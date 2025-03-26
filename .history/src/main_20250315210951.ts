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
  getValidToken,
  refreshToken,
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

// ✅ Vérification du logo au chargement
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

// ✅ Fonction pour initialiser l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  // Masquer l'application pendant l'initialisation
  const appContainer = document.getElementById("app");
  if (appContainer) appContainer.style.opacity = "0";

  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) loadingScreen.style.display = "flex";

  app.mount("#app");
  checkAndFixLogo();

  // ✅ Vérifier IndexedDB avant d'aller plus loin
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.error("🚨 IndexedDB est corrompue ou indisponible !");
    await resetIndexedDB(); // 🔥 Forcer un reset de la DB
    location.reload(); // 🔄 Recharger la page pour repartir sur une base propre
    return;
  }

  console.log("🔄 Restauration des tokens...");
  await restoreTokensIfNeeded();

  let jwt = await getValidToken(); // 🔥 Vérifie immédiatement si le JWT est valide

  if (!jwt) {
    console.warn("❌ Aucun JWT valide, tentative de rafraîchissement...");
    jwt = await refreshToken();
  }

  if (!jwt) {
    console.error("❌ Impossible de récupérer un JWT valide, redirection vers login !");
    router.replace("/login").then(() => {
      // ✅ S'assurer que l'écran de chargement disparaît après la redirection
      hideLoadingScreen();
    });
  } else {
    console.log("✅ JWT valide trouvé :", jwt);
    scheduleJwtRefresh(); // 🔄 Planifier le refresh automatique
    showApp();
  }
}

// ✅ Fonction pour masquer l'écran de chargement proprement
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.transition = "opacity 0.5s ease-out";
    loadingScreen.style.opacity = "0";
    setTimeout(() => (loadingScreen.style.display = "none"), 500);
  }

  const appContainer = document.getElementById("app");
  if (appContainer) {
    appContainer.style.transition = "opacity 0.5s ease-out";
    appContainer.style.opacity = "1";
  }
}

// ✅ Fonction pour afficher l'application quand elle est prête
function showApp() {
  setTimeout(hideLoadingScreen, 500);
}


// ✅ Vérifier IndexedDB avant de démarrer
async function initIndexedDB() {
  console.log("🔄 Vérification et initialisation d'IndexedDB...");
  try {
    const isReady = await verifyIndexedDBSetup();
    if (!isReady) {
      console.warn("⚠️ IndexedDB non initialisée correctement !");
      return;
    }
    console.log("✅ IndexedDB prête !");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation d'IndexedDB :", error);
  }
}

// ✅ Vérifier et restaurer l'authentification
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

    console.log("🔄 Tentative de restauration des tokens depuis IndexedDB...");
    await restoreTokensToIndexedDB();

    const jwt = await getValidToken();
    if (jwt) {
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
