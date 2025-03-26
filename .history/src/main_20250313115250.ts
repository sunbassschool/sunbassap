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
  getJWTFromIndexedDB,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken, 
  getRefreshTokenFromDB,
  restoreTokensToIndexedDB
} from "@/utils/api.ts";
const JWT_DB_KEY = "jwt";
const REFRESH_DB_KEY = "refresh_token";
(async () => {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    await verifyIndexedDBSetup();
    console.log("✅ IndexedDB prêt au lancement !");
    
    preventIndexedDBCleanup();

    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Vérification et correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    await syncRefreshToken();
    console.log("✅ Initialisation terminée !");
    
    scheduleJwtRefresh();
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation :", error);
  }
})();

// ✅ Restaure les tokens au démarrage si IndexedDB a été vidé
(async () => {
  console.log("🔄 Vérification des tokens au démarrage...");
  const storedJwt = await getJWTFromIndexedDB();
  const storedRefreshToken = await getRefreshTokenFromDB();
  if (!storedJwt || !storedRefreshToken) {
    console.warn("⚠️ IndexedDB semble vidé ! Tentative de restauration...");
    await restoreTokensToIndexedDB();
  }
})();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// 🔄 Vérification du JWT quand l'application revient au premier plan
let lastVisibilityCheck = 0; // 🕒 Stocke le dernier timestamp de vérification

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !document.hasFocus()) return; // 🔍 Vérifie aussi le focus

  const now = Date.now();
  if (now - lastVisibilityCheck < 30_000) { // ⏳ Vérifie si 30 sec se sont écoulées
    console.log("⏳ Vérification ignorée, trop rapprochée.");
    return;
  }

  lastVisibilityCheck = now; // 🔄 Met à jour le timestamp

  console.log("🔄 L'application est de retour au premier plan, vérification des tokens...");

  await checkAndRefreshOnWakeUp(); // 🔄 Vérifie et restaure les tokens

  const jwt = await getToken();
  if (!jwt) {
    console.warn("⚠️ Aucun JWT présent, l'utilisateur est probablement déconnecté.");
    return;
  }

  if (shouldRefreshJwt(jwt)) {
    console.warn("⏳ JWT proche de l'expiration, tentative de rafraîchissement...");
    await api.refreshToken();
  } else {
    console.log("✅ JWT encore valide !");
  }
});


// ✅ Vérifie et active la synchronisation en arrière-plan
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then(async (registration) => {
    if ("periodicSync" in registration) {
      try {
        await (registration as any).periodicSync.register("refresh-jwt", {
          minInterval: 15 * 60 * 1000,
        });
        console.log("✅ Background sync enregistré !");
      } catch (error) {
        console.warn("⚠️ Impossible d'enregistrer le background sync :", error);
      }
    } else {
      console.warn("⏳ Background sync non supporté.");
      registration.active?.postMessage({ type: "REGISTER_ALARM" });
    }
  });
}
