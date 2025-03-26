import { createApp } from "vue";
import 'font-awesome/css/font-awesome.min.css';
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

  // 🔄 Vérification d'IndexedDB
  let isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB absente !");

    // ✅ Vérifier si l'utilisateur a des tokens en local
    let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    // 🚨 Si aucun token et que IndexedDB est absente, on redirige immédiatement
    if (!jwt && !storedRefreshToken) {
      console.warn("🚨 Aucun token trouvé et IndexedDB absente, affichage du login !");
      if (loadingScreen) loadingScreen.style.display = "none"; // ✅ Vérification avant d'accéder
      showLoginScreen(); // 🚀 Afficher la page de connexion
      return;
    }
    console.log("🔄 Pas de base IndexedDB, mais des tokens locaux sont présents.");
  }

  // 🔄 Restauration des tokens (si IndexedDB est dispo)
  if (isDBReady) {
    console.log("🔄 Tentative de restauration des tokens...");
    await restoreTokensIfNeeded();
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  // ✅ Si aucun token, rediriger immédiatement vers la page de login
  if (!jwt) {
    console.warn("⚠️ Aucun JWT disponible, redirection vers login.");
    if (loadingScreen) loadingScreen.style.display = "none";
    showLoginScreen(); // 🚀 Rediriger vers la connexion
    return;
  }

  // 🔄 Vérification du JWT
  if (isJwtExpired(jwt)) {
    console.warn("⚠️ JWT expiré !");
    jwt = null;
  }

  // 🔄 Si JWT expiré, tentative de refresh
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    await handleRefreshToken();
    jwt = await getValidToken();
  }

  // ✅ Si JWT valide après refresh, on démarre l'application
  if (jwt) {
    console.log("✅ JWT valide, affichage de l'interface !");
    if (loadingScreen) loadingScreen.style.display = "none";
    if (appContainer) appContainer.style.opacity = "1";
    return;
  }

  // 🚨 Si toujours pas de JWT valide, redirection vers login
  console.warn("⚠️ Toujours pas de token valide, affichage de la page de connexion.");
  if (loadingScreen) loadingScreen.style.display = "none";
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

}

// ✅ Démarrage de l'application
initApp();
app.mount("#app");
