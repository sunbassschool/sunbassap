const logoElement = document.getElementById("loading-logo") as HTMLImageElement;
if (logoElement) {
  const baseUrl = import.meta.env.VITE_BASE_URL || "/";
  const newLogoPath = `${baseUrl}images/logo.png`;

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
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { 
  scheduleJwtRefresh, 
  getToken,
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
  updateTokens // ✅ Ajout de l'import manquant !
} from "@/utils/api.ts";


// Global flag pour éviter plusieurs refreshs simultanés
let isRefreshing = false;

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // Démarrage de Vue pour éviter l'écran blanc
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  // Afficher le loader au moins 1.5s
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
  }, 1500);

  // Vérifier IndexedDB et restaurer les tokens si nécessaire
  await initIndexedDB();
}

async function initIndexedDB() {
  console.log("🔄 Vérification d'IndexedDB en arrière-plan...");

  try {
    const indexedDBReady = await verifyIndexedDBSetup();
    if (!indexedDBReady) {
      console.warn("⚠️ IndexedDB a été supprimée, réinitialisation en cours...");
      await resetIndexedDB();
    }

    console.log("✅ IndexedDB est prête !");

    // ✅ Restauration des tokens si nécessaire AVANT l'authentification
    await restoreTokensIfNeeded();

    // Lancer l'authentification après la récupération des tokens
    await initAuth();
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation d'IndexedDB :", error);
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

    // Activer la protection d'IndexedDB
    preventIndexedDBCleanup();

    const userExists = await hasUserEverLoggedIn();
    console.log(`🧐 Vérification de la connexion précédente : ${userExists ? "Oui" : "Non"}`);

    if (userExists) {
      await syncRefreshToken();
    } else {
      console.log("🚀 Première connexion détectée, aucun refresh de token nécessaire.");
    }

    const jwt = await getToken();
    if (jwt) {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
    } else {
      console.log("🚀 Première connexion détectée, aucun JWT présent.");
      router.replace("/login");
    }
  } catch (error) {
    console.error("❌ Erreur d'initialisation :", error);
  }
}

let lastVisibilityCheck = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return;
  if (isRefreshing) {
    console.warn("⏳ Un refresh est déjà en cours, on annule cette tentative.");
    return;
  }

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification d'IndexedDB et des tokens après réveil...");

  try {
    isRefreshing = true;

    // ✅ Vérification de IndexedDB
    const indexedDBReady = await verifyIndexedDBSetup();
    if (!indexedDBReady) {
      console.warn("⚠️ IndexedDB a été supprimée, réinitialisation en cours...");
      await resetIndexedDB();
      await initIndexedDB();
    } else {
      console.log("✅ IndexedDB est intacte.");

      // ✅ Vérification du contenu d'IndexedDB
      const db = await openIndexedDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");

      const jwtInDB = await getItemFromStore(store, "jwtToken");
      const refreshTokenInDB = await getItemFromStore(store, "refreshToken");

      if (!jwtInDB || !refreshTokenInDB) {
        console.warn("⚠️ IndexedDB est vide ! Restauration des tokens...");
        await restoreTokensIfNeeded();
      } else {
        console.log("✅ IndexedDB contient bien les tokens.");
      }
    }

    // ✅ Mise à jour des tokens si nécessaire
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



// Démarrage de l'application
initApp();
