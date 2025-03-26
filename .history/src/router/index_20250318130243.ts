import { createRouter, createWebHistory } from "vue-router";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "../App.vue";
// ✅ Import d'App.vue AVANT son utilisation
import * as api from "@/utils/api.ts";

// 📌 Importation des fonctions utiles
import {
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getValidToken,
} from "@/utils/api.ts";

let isRefreshingNow = false; // ✅ Ajouté pour éviter l'erreur d'import

const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";

// 📌 Définition des routes
const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: "/", redirect: { name: "intro" } },
    { path: "/intro", name: "intro", component: () => import("@/views/IntroView.vue") },
    { path: "/dashboard", name: "dashboard", component: () => import("@/views/Dashboard.vue"), meta: { requiresAuth: true } },
    { path: "/login", name: "login", component: () => import("@/views/Login.vue") },
  ],
});

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 📌 Vérification de l'authentification avant navigation
router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) return next(); // Pas de restriction, on passe directement

  try {
    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête !");
      return next("/login");
    }

    let jwt = await getValidToken();

    if (!jwt && isRefreshingNow) {
      console.warn("🔄 Refresh en cours, on attend...");

      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          if (!isRefreshingNow) {
            clearInterval(interval);
            jwt = await getValidToken();
            resolve(jwt);
          }
        }, 500);
      });
    }

    if (jwt) {
      console.log("✅ JWT valide, accès autorisé.");
      return next();
    }

    console.warn("🚨 Aucun JWT valide, redirection vers login !");
    return next("/login");
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
    return next("/login");
  }
});

router.afterEach(() => {
  hideLoadingScreen(); // ✅ Masque le spinner après chaque changement de page
});

// 🚀 **Initialisation de l'application**
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  app.mount("#app"); // ✅ Monte l'application immédiatement pour éviter le bug du spinner

  console.log("🔄 Vérification IndexedDB...");
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, redirection vers login !");
    await router.replace("/login");
    return;
  }

  console.log("🔄 Restauration des tokens...");
  await restoreTokensIfNeeded();

  // ✅ Vérification du JWT
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🚨 Aucun JWT valide, redirection vers login !");
    await router.replace("/login");
  }

  hideLoadingScreen(); // ✅ Cache le spinner après l'initialisation
}

initApp();

export default router;

// ✅ Fonction pour cacher le spinner après le chargement
function hideLoadingScreen() {
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
  }, 500);
}
