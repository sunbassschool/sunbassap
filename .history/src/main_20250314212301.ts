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
  checkAndRestoreTokens, 
  getToken,
  openIndexedDB,
  shouldRefreshJwt,
  preventIndexedDBCleanup, 
  syncRefreshToken,
  resetIndexedDB,
  hasUserEverLoggedIn,
  updateTokens 
} from "@/utils/api.ts";

// ✅ Évite plusieurs suppressions simultanées de IndexedDB
let indexedDBResetInProgress = false;

// ✅ Démarrer Vue immédiatement pour éviter un écran blanc
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  // ✅ Vérifier et corriger le logo (exécuté en parallèle)
  checkAndFixLogo();

  // ✅ Vérification et initialisation d'IndexedDB + Auth
  await initIndexedDB();
  await initAuth();
}

// ✅ Vérification et initialisation d'IndexedDB
async function initIndexedDB(): Promise<void> {
  console.log("🔄 Vérification d'IndexedDB...");

  try {
    const db = await openIndexedDB("AuthDB", 1);
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("⚠️ IndexedDB corrompue, suppression et recréation...");
      await resetIndexedDB();
    }

    console.log("✅ IndexedDB prête !");
  } catch (error) {
    console.error("❌ Erreur IndexedDB :", error);
  }
}

// ✅ Gestion de l'authentification
async function initAuth() {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    preventIndexedDBCleanup();
    
    const userExists = await hasUserEverLoggedIn();
    console.log(`🧐 Connexion précédente : ${userExists ? "Oui" : "Non"}`);

    if (userExists) {
      await syncRefreshToken();
    } else {
      console.log("🚀 Première connexion détectée.");
    }

    const tokensRestored = await checkAndRestoreTokens();
    if (!tokensRestored) {
      console.log("🚀 Aucun JWT trouvé, redirection vers login.");
      router.replace("/login");
    } else {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
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

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens après réveil...");

  try {
    const jwt = await getToken();
    const refreshToken = localStorage.getItem("refreshToken");

    if (jwt && refreshToken) {
      console.log("🔄 Mise à jour des tokens après réveil...");
      await updateTokens(jwt, refreshToken);
    } else {
      console.warn("⚠️ Tokens manquants après réveil.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des tokens après réveil :", error);
  }
});

// ✅ Masquer l'écran de chargement
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.transition = "opacity 0.5s ease-out";
    loadingScreen.style.opacity = "0";
    setTimeout(() => (loadingScreen.style.display = "none"), 500);
  }
}

// ✅ Vérifier et corriger le logo si nécessaire
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

// ✅ Démarrage de l'application
initApp();
