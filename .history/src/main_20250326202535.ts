import { createApp, watch } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router/index";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { registerSW } from 'virtual:pwa-register';

import { verifyIndexedDBSetup, preventIndexedDBCleanup, checkIndexedDBStatus } from "@/utils/api";
import { getCache } from "@/utils/cacheManager";
import { useAuthStore } from "@/stores/authStore"; // ✅ Pour le watcher

const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

function finalizeApp() {
  console.log("🎉 Application prête !");
  
  if (loadingScreen) {
    loadingScreen.style.transition = "opacity 0.6s ease-out";
    loadingScreen.style.opacity = "0";
    setTimeout(() => loadingScreen.style.display = "none", 600);
  }

  if (appContainer) {
    appContainer.classList.add("app-visible");
  }
}

async function initializeApp() {
  console.log("🚀 Initialisation de l'application...");

  const dbReady = await verifyIndexedDBSetup();
  const jwt = localStorage.getItem("jwt");

  if (!dbReady && !jwt) {
    console.error("❌ IndexedDB indisponible ET aucun JWT local. Abandon.");
    return;
  }

  if (jwt && !dbReady) {
    console.warn("⚠️ IndexedDB non dispo, mais JWT trouvé. Lancement sans cache local.");
  }

  if (dbReady) {
    preventIndexedDBCleanup();
    checkIndexedDBStatus();
  }

  if (!navigator.onLine && getCache("userData_sunny")) {
    console.warn("⚠️ Mode hors ligne détecté. Utilisation du cache IndexedDB...");
  }

  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);

  app.mount("#app");

  // ✅ Intègre le watcher pour l'overlay de refresh
  const authStore = useAuthStore();
  watch(
    () => authStore.$state.isRefreshingToken,
    (isRefreshing) => {
      console.log("👀 Watcher déclenché - Refresh en cours ?", isRefreshing);
  
      const overlay = document.getElementById("refresh-overlay");
      if (!overlay) return;
  
      if (isRefreshing) {
        overlay.style.display = "block";
      } else {
        overlay.style.display = "none";
      }
    }
  );
  
  

  router.isReady().then(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (appContainer) {
          appContainer.style.display = "block";
          finalizeApp();
        }
      }, 0);
    });
  });

  // 🛠️ Service Worker - mise à jour
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('⚠️ Nouvelle version dispo !');
      const toast = document.getElementById('sw-update-toast');
      const btn = document.getElementById('sw-reload-btn');

      if (toast && btn) {
        toast.classList.add('show');
        btn.onclick = () => window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('✅ App prête pour le mode hors-ligne !');
    }
  });
}

export default initializeApp;
