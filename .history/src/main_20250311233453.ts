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
  isJwtExpired,
  getRefreshTokenFromDB, 
  verifyIndexedDBSetup,
  preventIndexedDBCleanup, 
  fixRefreshTokenStorage, 
  syncRefreshToken, 
  shouldRefreshJwt
  checkAndRefreshOnWakeUp 
} from "@/utils/api.ts";

(async () => {
  console.log("🔄 Initialisation de l'authentification...");

  try {
    // Vérification de la configuration d'IndexedDB
    await verifyIndexedDBSetup();
    console.log("✅ IndexedDB prêt au lancement !");

    // 🛡️ Protection contre la suppression d'IndexedDB
    preventIndexedDBCleanup();

    // Correction du stockage du refresh token si nécessaire
    if (!localStorage.getItem("fixRefreshDone")) {
      console.log("🛠️ Vérification et correction du stockage du refresh token...");
      await fixRefreshTokenStorage();
      localStorage.setItem("fixRefreshDone", "true");
    }

    // Vérifie si un refresh token est déjà présent et s'il est correct
    const storedRefreshToken = await getRefreshTokenFromDB();
    if (!storedRefreshToken) {
      console.warn("⚠️ Aucun refresh token trouvé dans IndexedDB.");
    } else if (isJwtExpired(storedRefreshToken)) {
      console.error("🚨 Le refresh token trouvé ressemble à un JWT et est potentiellement corrompu !");
    } else {
      console.log("✅ Refresh token valide détecté.");
    }

    // Synchronisation des tokens
    await syncRefreshToken();

    console.log("✅ Initialisation terminée !");
    
    // 🕒 Activation du refresh automatique uniquement après l'initialisation
    scheduleJwtRefresh();
    
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation :", error);
  }
})();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// 🔄 Vérification du JWT quand l'application revient au premier plan
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 L’application est de retour, vérification du JWT...");

    const jwt = await getToken();
    if (!jwt) {
      console.warn("⚠️ Aucun JWT présent, l'utilisateur est probablement déconnecté.");
      return;
    }

    if (shouldRefreshJwt(jwt)) { // 🔥 Rafraîchir 5 min avant expiration
      console.warn("⏳ JWT proche de l'expiration, tentative de rafraîchissement...");
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
