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
    // Ne redirige pas immédiatement vers login ici
    console.log("🔄 Pas de base IndexedDB, mais des tokens locaux sont présents.");
  }

  // 🔄 Restauration des tokens (si IndexedDB est dispo)
  if (isDBReady) {
    console.log("🔄 Tentative de restauration des tokens...");
    await restoreTokensIfNeeded();
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  // ✅ Si aucun token, laisser le routeur gérer la redirection vers login
  if (!jwt) {
    console.warn("⚠️ Aucun JWT disponible, préparation de la redirection vers login.");
    if (loadingScreen) loadingScreen.style.display = "none";
    if (appContainer) appContainer.style.opacity = "1";  // Démarre l'app mais laisser la logique de redirection au routeur
    return;
  }

  // 🔄 Vérification du JWT
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

  // 🚨 Si toujours pas de JWT valide, laisser la gestion de redirection au routeur
  console.warn("⚠️ Toujours pas de token valide, redirection vers login.");
  if (loadingScreen) loadingScreen.style.display = "none";
  if (appContainer) appContainer.style.opacity = "1";
}

async function finalizeApp() {
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
