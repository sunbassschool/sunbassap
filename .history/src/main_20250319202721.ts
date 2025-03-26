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
  handleRefreshToken,
  isJwtExpired
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
  if (appContainer) appContainer.style.opacity = "0"; // On cache l'interface au début

  let isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB absente !");
    let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    if (!jwt && !storedRefreshToken) {
      console.warn("🚨 Aucun token trouvé et IndexedDB absente, affichage du login !");
      if (loadingScreen) loadingScreen.style.display = "none";
      showLoginScreen();
      return;
    }
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide trouvé en mémoire, pas besoin de restaurer.");
  } else if (isDBReady) {
    console.log("🔄 Aucun JWT valide en mémoire, tentative de restauration des tokens...");
    await restoreTokensIfNeeded();
    jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    console.log("🔍 Après restauration, JWT en mémoire :", jwt);
  }

  if (!jwt) {
    console.warn("⚠️ Aucun JWT disponible, redirection vers login.");
    if (loadingScreen) loadingScreen.style.display = "none";
    showLoginScreen();
    return;
  }

  if (isJwtExpired(jwt)) {
    console.warn("⚠️ JWT expiré !");
    jwt = null;
  }

  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (!jwt && storedRefreshToken) {
    console.log("🔄 Tentative de rafraîchissement du token...");

    if (!storedRefreshToken) {
      console.warn("❌ Aucun refreshToken disponible, impossible de rafraîchir le JWT !");
      showLoginScreen();
      return;
    }

    await handleRefreshToken();
    jwt = await getValidToken();
    console.log("🔄 Après refresh, nouveau JWT :", jwt);
  }

  if (!jwt || isJwtExpired(jwt)) {
    console.warn("❌ JWT toujours expiré après tentative de refresh, suppression...");
    localStorage.removeItem("jwt");
    sessionStorage.removeItem("jwt");
    showLoginScreen();
    return;
  }

  console.log("✅ JWT valide, affichage de l'interface !");
  finalizeApp();
}



// ✅ Démarrage de l'application
initApp();
app.mount("#app");
