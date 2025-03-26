import { createRouter, createWebHistory } from "vue-router";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue"; // ✅ Import UNIQUE et bien placé
import * as api from "@/utils/api.ts";

// 📌 Importation des fonctions utiles
import {
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getValidToken,
  isRefreshingNow,
} from "@/utils/api.ts";

// 📌 Gestion de l’état d'authentification
let authCheckInProgress = false;

const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";

// 📌 Définition des routes
const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: "/", redirect: { name: "intro" } },
    { path: "/register-cursus", name: "RegisterCursus", component: () => import("@/views/RegisterCursus.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/reset-password", name: "Resetpassword", component: () => import("@/views/ResetPassword.vue") },
    { path: "/forgot-password", name: "Forgotpassword", component: () => import("@/views/ForgotPassword.vue") },
    { path: "/Createplanning", name: "CreatePlanning", component: () => import("@/views/CreatePlanning.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/cours", name: "cours", component: () => import("@/views/Cours.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/mon-espace", name: "mon-espace", component: () => import("@/views/MonEspace.vue"), meta: { requiresAuth: true } },
    { path: "/intro", name: "intro", component: () => import("@/views/IntroView.vue") },
    { path: "/home", name: "home", component: () => import("@/views/HomeView.vue") },
    { path: "/dashboard", name: "dashboard", component: () => import("@/views/Dashboard.vue"), meta: { requiresAuth: true } },
    { path: "/login", name: "login", component: () => import("@/views/Login.vue") },
  ],
});

// 📌 Vérification de l'authentification avant navigation
router.beforeEach(async (to, from, next) => {
  if (authCheckInProgress) {
    console.warn("⚡ Vérification déjà en cours...");
    return next();
  }

  authCheckInProgress = true;

  if (!to.meta.requiresAuth) {
    authCheckInProgress = false;
    return next();
  }

  try {
    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête !");
      authCheckInProgress = false;
      return next("/login");
    }

    let jwt = await getValidToken();

    // 🕵️‍♂️ Attente si un refresh est en cours
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
      authCheckInProgress = false;
      return next();
    }

    console.warn("🚨 Aucun JWT valide après attente, redirection vers login !");
    authCheckInProgress = false;
    return next("/login");
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
    authCheckInProgress = false;
    return next("/login");
  }
});

// 🚀 Initialisation de l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

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
    return;
  }

  // ✅ Monter l'application
  app.mount("#app");
  console.log("✅ Application montée !");
}

initApp();

export default router;
