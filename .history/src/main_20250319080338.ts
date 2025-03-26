import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue"; // S'assurer que l'import est bien absolu
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { jwtDecode } from "jwt-decode"; // ✅ Correct pour Vite et ES Modules

import { 
  scheduleJwtRefresh,
  restoreTokensIfNeeded,
  getValidToken,
  verifyIndexedDBSetup,
  handleRefreshToken
} from "@/utils/api.ts";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// ✅ Gestion améliorée du chargement
const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  if (loadingScreen) loadingScreen.style.display = "flex";
  if (appContainer) appContainer.style.opacity = "0";

  let isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non accessible, tentative de recréation...");
    isDBReady = await verifyIndexedDBSetup();
  }

  if (!isDBReady) {
    console.error("❌ IndexedDB inaccessible, on ignore son utilisation.");
  } else {
    console.log("🔄 Restauration des tokens en cours...");
    await restoreTokensIfNeeded();
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (!jwt && isDBReady) {
    console.log("🔄 Recherche du JWT dans IndexedDB...");
    jwt = await getValidToken();
  }

  // ✅ Si aucun token, rediriger immédiatement vers la page de login
  if (!jwt && !storedRefreshToken) {
    console.warn("⚠️ Aucun token trouvé, redirection immédiate vers login.");
    loadingScreen.style.display = "none"; // Masquer le chargement
    showLoginScreen(); // 🚀 Fonction pour afficher la page de connexion
    return;
  }

  // 🔄 Vérification du JWT
  if (jwt) {
    try {
      const decoded = jwtDecode(jwt);
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        console.warn("⚠️ JWT expiré !");
        jwt = null;
      }
    } catch (error) {
      console.error("❌ Erreur lors du décodage du JWT :", error);
      jwt = null;
    }
  }

  // 🔄 Si JWT expiré, tentative de refresh
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    await handleRefreshToken();
    jwt = await getValidToken();
  }

  // ✅ Si JWT valide après refresh, on démarre l'application
  if (jwt) {
    console.log("✅ JWT valide, affichage de l'interface !");
    loadingScreen.style.display = "none"; // Masquer le chargement
    appContainer.style.opacity = "1"; // Afficher l'application
    return;
  }

  // 🚨 Si toujours pas de JWT valide, redirection vers login
  console.warn("⚠️ Aucun JWT valide trouvé, affichage de la page de connexion.");
  loadingScreen.style.display = "none";
  showLoginScreen();
}




// ✅ Fonction pour afficher l'UI et cacher le loading screen
function finalizeApp() {
  console.log("🎉 Application prête !");

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

// ✅ Fonction pour rediriger vers `/login` proprement
function showLoginScreen() {
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
  document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("refreshToken");

  finalizeApp(); // 🔥 Cache le loading screen avant la redirection
  setTimeout(() => router.replace("/login"), 500);
}

// ✅ Démarrage de l'application
initApp();
app.mount("#app");
