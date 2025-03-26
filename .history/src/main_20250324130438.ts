import { createApp } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router/index.ts";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { registerSW } from 'virtual:pwa-register';

import { verifyIndexedDBSetup, preventIndexedDBCleanup, checkIndexedDBStatus } from "@/utils/api";
import { getCache } from "@/utils/cacheManager";

const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

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

(async () => {
  console.log("🚀 Initialisation de l'application...");

  const dbReady = await verifyIndexedDBSetup();
  const jwt = localStorage.getItem("jwt");

  if (!dbReady && !jwt) {
    console.error("❌ IndexedDB indisponible ET aucun JWT local. Abandon.");
    return;
  }

  if (jwt && !dbReady) {
    console.warn("⚠️ IndexedDB non dispo, mais JWT trouvé. Lancement sans cache local.");
    // (optionnel : afficher un toast ou bannière ici)
  }

  if (dbReady) {
    preventIndexedDBCleanup();
    checkIndexedDBStatus();
  }

  // 🌐 Mode offline + cache ?
  if (!navigator.onLine && getCache("userData_sunny")) {
    console.warn("⚠️ Mode hors ligne détecté. Utilisation du cache IndexedDB...");
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  app.mount("#app");
  router.isReady().then(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById("app")!.style.display = "block";
        finalizeApp(); // gère le fade out de l'écran de chargement
      }, 1000); // ou 0 si tu veux direct
    });
  });

  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('⚠️ Nouvelle version dispo !');
      const toast = document.getElementById('sw-update-toast');
      const btn = document.getElementById('sw-reload-btn');

      if (toast && btn) {
        toast.style.display = 'block';
        btn.onclick = () => window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('✅ App prête pour le mode hors-ligne !');
    },
  });
})();
