import { createRouter, createWebHistory } from "vue-router";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue"; // ✅ Import en haut
import * as api from "@/utils/api.ts";

// 📌 Importation des fonctions utiles
import {
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getValidToken,
} from "@/utils/api.ts";

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

// 🚀 **Créer l'application après la configuration du router**
const app = createApp(App); // ✅ Déplacé ici, après avoir défini `router`
app.use(createPinia());
app.use(router);

// ✅ Monter l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

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
    hideLoadingScreen();
    return;
  }

  // ✅ Monter l'application après la vérification
  app.mount("#app");
  console.log("✅ Application montée !");
}

initApp();

export default router;

// ✅ Fonction pour masquer le spinner de chargement
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
