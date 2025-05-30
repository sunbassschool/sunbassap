import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import * as api from "@/utils/api";

import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { 
  scheduleJwtRefresh, 
  getToken,
  shouldRefreshJwt,
  checkAndRefreshOnWakeUp,
  verifyIndexedDBSetup,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken,
  checkIndexedDBStatus
} from "@/utils/api.ts";
document.addEventListener("DOMContentLoaded", () => {
  const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
  if (logoElement) {
    const baseUrl = import.meta.env.VITE_BASE_URL || "/app/";
    logoElement.src = `${baseUrl}images/logo.png`;
  }
});

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // 🚀 Démarrer Vue immédiatement pour éviter un écran blanc
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");
const minLoadingTime = 1500; // ⏳ Minimum 1.5s avant de cacher le loader
const startTime = Date.now();
  // 🔄 Supprime immédiatement l’écran de chargement
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => loadingScreen.remove(), 500);
    }
  }, 500);

  // ⚡️ Vérifier IndexedDB et Token en arrière-plan (sans bloquer l'affichage)
  setTimeout(async () => {
    console.log("🔍 Vérification des données en arrière-plan...");
    await checkIndexedDBStatus();
    const jwt = await getToken();
    console.log("🔑 Token vérifié :", jwt);
  }, 200);
}

initApp();


// ✅ Initialisation unique de l'authentification
(async () => {
  console.log("🔄 Initialisation de l'authentification...");
  try {
    await verifyIndexedDBSetup();
    preventIndexedDBCleanup();

    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    await syncRefreshToken();

    // 🚀 Planifier le rafraîchissement du JWT une seule fois
    if (!window.jwtRefreshScheduled) {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
      window.jwtRefreshScheduled = true;
    }
  } catch (error) {
    console.error("❌ Erreur d'initialisation :", error);
  }
})();

// ✅ Vérification des tokens après réveil de l'application
let lastVisibilityCheck = 0;
let isRefreshing = false; // 🚨 Ajout d'un verrou

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return; // Vérification max toutes les 60s
  if (isRefreshing) {
    console.warn("⏳ Un refresh est déjà en cours, on annule cette tentative.");
    return;
  }

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens après réveil...");
  
  try {
    isRefreshing = true; // 🔒 Active le verrou
    const jwt = await getToken();
    
    if (!jwt) {
      console.warn("⚠️ Aucun JWT récupéré, pas de refresh nécessaire.");
    } else if (shouldRefreshJwt(jwt)) {
      console.log("🔄 JWT expiré, tentative de rafraîchissement...");
      await checkAndRefreshOnWakeUp();
    } else {
      console.log("✅ JWT encore valide, aucune action nécessaire.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du token après réveil :", error);
  } finally {
    isRefreshing = false; // 🔓 Libère le verrou après exécution
  }
});


