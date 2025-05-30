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

// ✅ Initialisation de l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");
  
  // 🔍 Vérifier IndexedDB avant de démarrer Vue
  await checkIndexedDBStatus(); 

  // 🔑 Récupérer le token avant de charger Vue
  const jwt = await getToken();
  console.log("🔑 Token récupéré avant chargement Vue :", jwt);
// 🚀 Définir dynamiquement l'URL du logo avant que Vue ne monte
const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
if (logoElement) {
  const baseUrl = import.meta.env.VITE_BASE_URL || "/app/";
  logoElement.src = `${baseUrl}images/logo.png`;
}

// 🚀 Démarrer Vue immédiatement pour éviter un écran blanc
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// ⏳ Minimum 1.5s d'affichage du loader
const minLoadingTime = 1500;
const startTime = Date.now();

setTimeout(() => {
  const elapsedTime = Date.now() - startTime;
  const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => loadingScreen.remove(), 500);
    }
  }, remainingTime);
}, 0);


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
}

