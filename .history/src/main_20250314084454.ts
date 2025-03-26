import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import * as api from "@/utils/api";

import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { 
  scheduleJwtRefresh, 
  getToken,
  shouldRefreshJwt,
  checkAndRefreshOnWakeUp,
  verifyIndexedDBSetup,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken,
  checkIndexedDBStatus
} from "@/utils/api.ts";

// ✅ Initialisation de l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");
  
  // 🔍 Vérifier IndexedDB avant de démarrer Vue
  await checkIndexedDBStatus(); 

  // 🔑 Récupérer le token avant de charger Vue
  const jwt = await getToken();
  console.log("🔑 Token récupéré avant chargement Vue :", jwt);

  // 🚀 Démarrer Vue après la vérification du token
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");
}

initApp();

// ✅ Initialisation unique de l'authentification
(async () => {
  console.log("🔄 Initialisation de l'authentification...");
  try {
    await verifyIndexedDBSetup();
    preventIndexedDBCleanup();

    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    await syncRefreshToken();

    // 🚀 Planifier le rafraîchissement du JWT une seule fois
    if (!window.jwtRefreshScheduled) {
      console.log("⏳ Planification du rafraîchissement du JWT...");
      scheduleJwtRefresh();
      window.jwtRefreshScheduled = true;
    }
  } catch (error) {
    console.error("❌ Erreur d'initialisation :", error);
  }
})();

// ✅ Vérification des tokens après réveil de l'application
let lastVisibilityCheck = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return; // Vérification max toutes les 60s

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens après réveil...");
  
  // 🔄 Rafraîchir immédiatement si le token est expiré
  if (await shouldRefreshJwt()) {
    console.log("🔄 JWT expiré, tentative de rafraîchissement...");
    await checkAndRefreshOnWakeUp();
  } else {
    console.log("✅ JWT encore valide, aucune action nécessaire.");
  }
});
