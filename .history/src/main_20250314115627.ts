const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
if (logoElement) {
  const baseUrl = import.meta.env.VITE_BASE_URL || "/";
  const newLogoPath = `${baseUrl}images/logo.png`;

  // Vérifier si l'image définie par défaut est accessible
  fetch(logoElement.src, { method: "HEAD" })
    .then(response => {
      if (!response.ok) {
        console.warn("⚠️ Chemin du logo invalide en prod, correction en cours...");
        logoElement.src = newLogoPath;
      }
    })
    .catch(() => {
      console.warn("⚠️ Impossible de charger le logo, correction en cours...");
      logoElement.src = newLogoPath;
    });
}

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
  checkIndexedDBStatus,
  hasUserEverLoggedIn
} from "@/utils/api.ts";

// ✅ Global Flag pour éviter plusieurs refreshs simultanés
let isRefreshing = false;

/**
 * 🚀 1️⃣ Initialisation de l'application
 */
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // 🔍 Vérifier IndexedDB en arrière-plan
  checkIndexedDBStatus();

  // 🚀 Monter Vue immédiatement pour éviter l'écran blanc
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  // 🔑 Récupérer le token avant de charger Vue
  const jwt = await getToken();
  console.log("🔑 Token récupéré avant chargement Vue :", jwt);

  // 🕐 Assurer un minimum d'affichage du loader (1.5s)
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => loadingScreen.style.display = "none", 500);
    }
  }, 2500);
}

/**
 * 🔄 2️⃣ Initialisation de l'authentification
 */
async function initAuth() {
  console.log("🔄 Initialisation de l'authentification...");
  try {
    await verifyIndexedDBSetup();
    preventIndexedDBCleanup();

    // 🛠️ Correction unique du stockage du refresh token si nécessaire
    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    // 🧐 Vérifier si l'utilisateur s'est déjà connecté avant de tenter un refresh
    const userExists = await hasUserEverLoggedIn();
    console.log(`🧐 Vérification de la connexion précédente : ${userExists ? "Oui" : "Non"}`);

    if (userExists) {
      await syncRefreshToken();
    } else {
      console.log("🚀 Aucun utilisateur jamais connecté, pas de tentative de refresh.");
    }

    // ⏳ Planification du rafraîchissement du JWT uniquement si un JWT est présent
    const jwt = await getToken();
    if (jwt) {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
    } else {
      console.log("❌ Aucun JWT trouvé, aucun rafraîchissement programmé.");
    }
  } catch (error) {
    console.error("❌ Erreur d'initialisation :", error);
  }
}

/**
 * 🔄 3️⃣ Vérification des tokens après réveil de l'application
 */
let lastVisibilityCheck = 0;
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
    isRefreshing = true;
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
    isRefreshing = false;
  }
});

// 🚀 Démarrer l'application
initApp();
initAuth();
