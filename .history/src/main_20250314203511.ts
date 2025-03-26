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
async function checkAndFixLogo() {
  console.log("🔍 Vérification du logo...");

  const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
  if (!logoElement) return;

  const baseUrl = import.meta.env.VITE_BASE_URL || "/";
  const newLogoPath = `${baseUrl}images/logo.png`;

  try {
    const response = await fetch(logoElement.src, { method: "HEAD" });
    if (!response.ok) {
      console.warn("⚠️ Logo invalide, mise à jour...");
      logoElement.src = newLogoPath;
    }
  } catch {
    console.warn("⚠️ Échec du chargement du logo, mise à jour...");
    logoElement.src = newLogoPath;
  }
}

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // ✅ Démarrer Vue immédiatement pour éviter un écran blanc
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  // ✅ Lancer en parallèle
  checkAndFixLogo(); // ✅ Vérifie le logo sans bloquer
  const dbInit = initIndexedDB(); // ✅ Démarrer l'init de IndexedDB en arrière-plan
  const authInit = initAuth(); // ✅ Démarrer l'auth sans attendre IndexedDB

  await Promise.all([dbInit, authInit]); // ✅ Attendre que tout soit fini
  hideLoadingScreen(); // ✅ Masquer l'écran de chargement
}

let indexedDBReady = false; // ✅ Cache pour éviter plusieurs accès

async function initIndexedDB(): Promise<void> {
  if (indexedDBReady) return console.log("✅ IndexedDB déjà initialisé.");
  console.log("🔄 Vérification d'IndexedDB...");

  try {
    const db = await openIndexedDB("AuthDB", 1);
    
    // ✅ Si `authStore` est manquant, il faut le recréer AVANT de continuer
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("⚠️ IndexedDB corrompue, suppression et recréation...");
      await resetIndexedDB();
      
      // 🛑 On attend un court instant que la base soit bien recréée
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("✅ IndexedDB recréée !");
    }

    indexedDBReady = true; // ✅ Marquer IndexedDB comme prête
    console.log("✅ IndexedDB prête !");
  } catch (error) {
    console.error("❌ Erreur IndexedDB :", error);
  }
}


async function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.transition = "opacity 0.5s ease-out";
    loadingScreen.style.opacity = "0";
    setTimeout(() => (loadingScreen.style.display = "none"), 500);
  }
}

async function initAuth() {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    preventIndexedDBCleanup();
    const userExists = await hasUserEverLoggedIn();
    console.log(`🧐 Connexion précédente : ${userExists ? "Oui" : "Non"}`);

    if (userExists) {
      await syncRefreshToken();
    } else {
      console.log("🚀 Première connexion détectée.");
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
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return;
  if (isRefreshing) {
    console.warn("⏳ Un refresh est déjà en cours.");
    return;
  }

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification d'IndexedDB après réveil...");

  try {
    isRefreshing = true;

    const indexedDBReady = await verifyIndexedDBSetup();
    if (!indexedDBReady) {
      console.warn("⚠️ IndexedDB supprimée, réinitialisation...");
      await resetIndexedDB();
      await initIndexedDB();
    } else {
      console.log("✅ IndexedDB intacte.");
      const db = await openIndexedDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");

      const jwtInDB = await getItemFromStore(store, "jwt");
      const refreshTokenInDB = await getItemFromStore(store, "refreshToken");

      if (!jwtInDB || !refreshTokenInDB) {
        console.warn("⚠️ Tokens absents, restauration...");
        await restoreTokensIfNeeded();
      } else {
        console.log("✅ Tokens présents en IndexedDB.");
      }
    }

    const jwt = await getToken();
    const refreshToken = localStorage.getItem("refreshToken");

    if (jwt && refreshToken) {
      console.log("🔄 Mise à jour des tokens après réveil...");
      await updateTokens(jwt, refreshToken);
    } else {
      console.warn("⚠️ Tokens manquants après réveil.");
    }
  } catch (error) {
    console.error("❌ Erreur lors du réveil :", error);
  } finally {
    isRefreshing = false;
  }
});

// ✅ Démarrage de l'application
initApp();
