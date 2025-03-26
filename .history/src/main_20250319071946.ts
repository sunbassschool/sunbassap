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

  console.log("🔍 Récupération des tokens...");

  // 🔥 1️⃣ Priorité à localStorage/sessionStorage
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // 🔍 2️⃣ Vérifier si le JWT est valide
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

  // 🔄 3️⃣ Si JWT est toujours invalide, essayer IndexedDB
  if (!jwt) {
    console.log("🔄 Essai de récupération depuis IndexedDB...");

    const isDBReady = await verifyIndexedDBSetup();
    if (isDBReady) {
      await restoreTokensIfNeeded();
      jwt = await getValidToken();
    } else {
      console.warn("⚠️ IndexedDB non accessible !");
    }
  }

  // 🔄 4️⃣ Si JWT est toujours invalide, tenter un refresh via refreshToken
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    await handleRefreshToken();
    jwt = await getValidToken();  // Vérifie à nouveau après le refresh
  }

  // ✅ 5️⃣ Si JWT valide après refresh ou récupération, démarrer l'app
  if (jwt) {
    console.log("✅ JWT valide, l'utilisateur est connecté !");
    finalizeApp();
    return;
  }

  // 🚨 6️⃣ Si toujours pas de JWT valide, redirection vers login
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
