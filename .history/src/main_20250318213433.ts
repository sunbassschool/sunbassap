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

  // Affichage du loading screen
  if (loadingScreen) loadingScreen.style.display = "flex";
  if (appContainer) appContainer.style.opacity = "0";

  // Vérifier IndexedDB avant d’accéder aux tokens
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, récupération impossible !");
    showLoginScreen();
    return;
  }

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  let jwt = await getValidToken();
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // Vérifier si le JWT est expiré
  if (jwt) {
    try {
      const decoded = jwtDecode(jwt);
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < now) {
        console.warn("⚠️ JWT expiré !");
        jwt = null;  // Le JWT est expiré, on le remet à null
      }
    } catch (error) {
      console.error("❌ Erreur lors du décodage du JWT :", error);
      jwt = null;
    }
  }

  // ✅ Amélioration : attendre le refresh si JWT invalide
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    await handleRefreshToken();
    jwt = await getValidToken(); // 🔥 Vérifie à nouveau après le refresh
  }

  // ✅ Si JWT valide après refresh, on démarre l'app
  if (jwt) {
    console.log("✅ JWT valide, l'utilisateur est connecté !");
    finalizeApp();
    return;
  }

  // 🚨 Si toujours pas de JWT valide, redirection vers login
  console.warn("⚠️ Aucun JWT valide trouvé, redirection vers login.");
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
