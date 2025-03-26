import { createApp } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { verifyIndexedDBSetup, preventIndexedDBCleanup, checkIndexedDBStatus } from "@/utils/api";
import { getCache } from "@/utils/cacheManager";

const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

// ✅ Fonction pour cacher l'écran de chargement
function finalizeApp() {
  console.log("🎉 Application prête !");

  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.6s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 600);
    }

    if (appContainer) {
      appContainer.classList.add("app-visible");
    }
  }, 300);
}

// ✅ Initialisation principale
(async () => {
  console.log("🚀 Initialisation de l'application...");

  const dbReady = await verifyIndexedDBSetup();
  if (!dbReady) {
    console.error("❌ Échec de la préparation d'IndexedDB. Abandon.");
    return;
  }

  // 🔐 Protection session : garder IndexedDB vivante
  preventIndexedDBCleanup();
  checkIndexedDBStatus();

  // 🌐 Mode offline + données en cache ?
  if (!navigator.onLine && getCache("userData_sunny")) {
    console.warn("⚠️ Mode hors ligne détecté. Utilisation du cache...");
    // (optionnel : afficher une bannière ou toast)
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  app.mount("#app");
  router.isReady().then(() => {
    requestAnimationFrame(() => {
      // ⏳ Attendre pour lire la citation
      setTimeout(() => {
        finalizeApp();
      }, 5000);
    });
  });
  import { registerSW } from 'virtual:pwa-register'

  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('⚠️ Nouvelle version dispo ! Recharge recommandée.')
      // Tu peux afficher un toast ou forcer un reload si tu veux
      // window.location.reload();
    },
    onOfflineReady() {
      console.log('✅ App prête pour le mode hors-ligne !')
    },
  });




})();
