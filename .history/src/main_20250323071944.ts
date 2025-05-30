
<template>
  <div class="app-container">
    <!-- ✅ Overlay pendant refresh -->
    <RefreshOverlay v-if="authStore.isRefreshingToken" />

    <!-- ✅ Le contenu n’apparaît que si refresh terminé -->
    <router-view v-if="!authStore.isRefreshingToken" />
  </div>
</template>

import { createApp } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { verifyIndexedDBSetup } from "@/utils/api";

const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

// ✅ Fonction pour cacher l'écran de chargement
function finalizeApp() {
  console.log("🎉 Application prête !");

  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app");

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



// ✅ Lancement avec initialisation préalable d'IndexedDB
(async () => {
  console.log("🚀 Initialisation de l'application...");

  const dbReady = await verifyIndexedDBSetup();
  if (!dbReady) {
    console.error("❌ Échec de la préparation d'IndexedDB. Abandon.");
    return;
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  app.mount("#app");
  finalizeApp();
})();
