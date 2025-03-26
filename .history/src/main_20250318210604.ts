import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "@/assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { jwtDecode } from "jwt-decode";
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
  updateTokens,
  refreshToken
} from "@/utils/api.ts";

let isAuthReady = false; // ✅ État global d'authentification

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // 🚀 Vérifie IndexedDB avant tout
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête !");
    return redirectToLogin();
  }

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  let jwt = await getStoredJWT();
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (jwt) {
    try {
      const decoded = jwtDecode(jwt);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.warn("⚠️ JWT expiré !");
        jwt = null;
      }
    } catch (error) {
      console.error("❌ Erreur lors du décodage du JWT :", error);
      jwt = null;
    }
  }

  // 🔥 Rafraîchissement du JWT si nécessaire
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    jwt = await refreshToken();
  }

  if (jwt) {
    console.log("✅ JWT valide, l'utilisateur est connecté !");
    isAuthReady = true;
    window.dispatchEvent(new Event("authReady")); // ✅ Informe Vue que l’auth est prête
  } else {
    console.warn("⚠️ Aucun JWT valide trouvé, redirection vers login.");
    return redirectToLogin();
  }

  // ✅ Montage de l’application après la validation de l’auth
  mountApp();
}

function redirectToLogin() {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
  document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshToken");
  isAuthReady = false;
  window.dispatchEvent(new Event("authReady")); // 🚀 Signale que l’auth est terminée (même si KO)
  router.replace("/login");
}

function mountApp() {
  console.log("🚀 Montage de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
  }, 500);
}

// ✅ Démarrage de l'application
initApp();
