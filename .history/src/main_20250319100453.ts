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

  // ✅ Afficher l'écran de chargement et attendre un cycle de rendu
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  if (appContainer) appContainer.style.opacity = "0";

  // ✅ Vérification d'IndexedDB avec gestion d'erreur
  let isDBReady = false;
  try {
    isDBReady = await verifyIndexedDBSetup();
  } catch (error) {
    console.error("❌ Erreur critique avec IndexedDB :", error);
    alert("Problème technique : votre navigateur ne supporte pas IndexedDB.");
  }

  // ✅ Si IndexedDB est absente, vérifier immédiatement si l'utilisateur a des tokens
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (!isDBReady && !jwt && !storedRefreshToken) {
    console.warn("🚨 Aucun token et IndexedDB absente, affichage immédiat de la connexion !");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        showLoginScreen();
      }, 300);
    } else {
      showLoginScreen();
    }
    return;
  }

  // ✅ Tentative de restauration des tokens AVEC TIMEOUT
  let restorePromise = restoreTokensIfNeeded();
  let restoreTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000)); // ⏳ Timeout 5s max

  await Promise.race([restorePromise, restoreTimeout]); // 🔥 Évite de bloquer 20s

  jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  if (!jwt) {
    console.warn("⚠️ Aucun JWT disponible après restauration, redirection vers login.");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        showLoginScreen();
      }, 300);
    } else {
      showLoginScreen();
    }
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

  // 🔄 Si JWT expiré, tentative de refresh AVEC TIMEOUT
  storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");
    let refreshPromise = handleRefreshToken();
    let refreshTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000)); // ⏳ Timeout 5s max

    await Promise.race([refreshPromise, refreshTimeout]); // 🔥 Évite d’attendre trop longtemps
    jwt = await getValidToken();
  }

  if (jwt) {
    console.log("✅ JWT valide, affichage de l'interface !");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        if (appContainer) appContainer.style.opacity = "1";
      }, 300);
    } else if (appContainer) {
      appContainer.style.opacity = "1";
    }
    return;
  }

  console.warn("⚠️ Toujours pas de token valide, affichage de la page de connexion.");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      showLoginScreen();
    }, 300);
  } else {
    showLoginScreen();
  }
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
