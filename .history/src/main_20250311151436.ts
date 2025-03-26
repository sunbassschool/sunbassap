import { createApp } from "vue";
import { refreshToken } from "@/utils/api"; // Vérifie que c'est bien une fonction importée

import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { restoreSession  } from "@/utils/api.ts";
import * as api from "@/utils/api"; 
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { 
  scheduleJwtRefresh, 
  getToken,
  refreshToken,
  isJwtExpired,
  getRefreshTokenFromDB, 
  verifyIndexedDBSetup ,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken, 
  checkAndRefreshOnWakeUp 
} from "@/utils/api.ts";

verifyIndexedDBSetup().then(() => {
  console.log("✅ IndexedDB prêt au lancement !");
});
// 🛡️ Protection contre la suppression d'IndexedDB
preventIndexedDBCleanup();

// ⏳ Rafraîchissement programmé toutes les 10 minutes
scheduleJwtRefresh();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// ✅ Initialisation complète au démarrage
(async () => {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    if (!localStorage.getItem("fixRefreshDone")) {
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    await syncRefreshToken();  // ✅ Synchronisation + vérification du refresh en une seule étape

    console.log("✅ Initialisation terminée !");
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation :", error);
  }
})();




// 🔄 Vérification du JWT quand l'application revient au premier plan
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 L’application est de retour, vérification du JWT...");

    const jwt = await getToken();
    if (!jwt) {
      console.warn("⚠️ Aucun JWT présent, l'utilisateur est probablement déconnecté.");
      return;
    }

    if (isJwtExpired(jwt)) {
      console.warn("🚨 JWT expiré, tentative de rafraîchissement...");
      await api.refreshToken();
    } else {
      console.log("✅ JWT encore valide !");
    }
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
