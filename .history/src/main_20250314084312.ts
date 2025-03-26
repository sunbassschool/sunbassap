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



async function initApp() {
  console.log("🚀 Initialisation de l'application...");
  
  // ✅ Vérifier IndexedDB avant de démarrer Vue
  await checkIndexedDBStatus(); 

  // ✅ Récupérer le token avant de charger l'app
  const jwt = await getToken();
  console.log("🔑 Token récupéré avant chargement Vue :", jwt);

  // ⚡️ Démarrer Vue après la vérification du token
  createApp(App).use(router).mount("#app");
}

initApp();

// ✅ Initialisation unique
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
    if (!window.jwtRefreshScheduled) {
      scheduleJwtRefresh();
      window.jwtRefreshScheduled = true;
    }
  } catch (error) {
    console.error("❌ Erreur d'initialisation :", error);
  }
})();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// ✅ Vérification des tokens seulement toutes les 60 secondes max
let lastVisibilityCheck = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return;

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens...");
  await checkAndRefreshOnWakeUp();
});
