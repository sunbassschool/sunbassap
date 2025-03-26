import { createRouter, createWebHistory } from "vue-router";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import {
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getValidToken,
  isRefreshingNow,
} from "@/utils/api.ts";

// 📌 Définition des routes
const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";
const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: "/", redirect: { name: "intro" } },
    { path: "/register-cursus", name: "RegisterCursus", component: () => import("@/views/RegisterCursus.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/reset-password", name: "ResetPassword", component: () => import("@/views/ResetPassword.vue") },
    { path: "/forgot-password", name: "ForgotPassword", component: () => import("@/views/ForgotPassword.vue") },
    { path: "/create-planning", name: "CreatePlanning", component: () => import("@/views/CreatePlanning.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/cours", name: "Cours", component: () => import("@/views/Cours.vue"), meta: { requiresAuth: true, role: "admin" } },
    { path: "/mon-espace", name: "MonEspace", component: () => import("@/views/MonEspace.vue"), meta: { requiresAuth: true } },
    { path: "/intro", name: "Intro", component: () => import("@/views/IntroView.vue") },
    { path: "/home", name: "Home", component: () => import("@/views/HomeView.vue") },
    { path: "/partitions", name: "Partitions", component: () => import("@/views/Partitions.vue") },
    { path: "/register", name: "Register", component: () => import("@/views/Register.vue") },
    { path: "/register-form", name: "RegisterForm", component: () => import("@/views/RegisterForm.vue") },
    { path: "/planning", name: "Planning", component: () => import("@/views/Planning.vue"), meta: { requiresAuth: true } },
    { path: "/replay", name: "Replay", component: () => import("@/views/Replay.vue"), meta: { requiresAuth: true } },
    { path: "/videos", name: "Videos", component: () => import("@/views/Videos.vue") },
    { path: "/dashboard", name: "Dashboard", component: () => import("@/views/Dashboard.vue"), meta: { requiresAuth: true } },
    { path: "/login", name: "Login", component: () => import("@/views/Login.vue") },
    { path: "/prendreuncours", name: "PrendreUnCours", component: () => import("@/views/PrendreUnCours.vue") },
  ],
});

// 🚀 **Middleware pour gérer l'authentification avant navigation**
router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) return next(); // ✅ Si pas besoin d'auth, continuer

  console.log("🔄 Vérification de l'authentification...");
  
  // ✅ Vérifier si IndexedDB est prêt
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, redirection vers login !");
    return next("/login");
  }

  let jwt = await getValidToken();

  // 🔄 Si un refresh est en cours, attendre jusqu'à 6 secondes
  if (!jwt && isRefreshingNow) {
    console.warn("⏳ Attente du rafraîchissement du JWT...");

    try {
      jwt = await new Promise(resolve => {
        const checkInterval = setInterval(async () => {
          if (!isRefreshingNow) {
            clearInterval(checkInterval);
            resolve(await getValidToken());
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 6000);
      });
    } catch {
      console.warn("⚠️ Impossible d'attendre un JWT valide !");
    }
  }

  // ✅ Si JWT valide, continuer
  if (jwt) {
    console.log("✅ JWT valide, accès autorisé.");
    return next();
  }

  // 🚨 Si pas de JWT valide, redirection vers `/login`
  console.warn("🚨 Aucun JWT valide après attente, redirection !");
  return next("/login");
});

// 🚀 **Initialisation de l'application**
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  // ✅ Vérifier IndexedDB avant d'accéder aux tokens
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, redirection vers login !");
    return router.replace("/login");
  }

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  // ✅ Vérifier le JWT après restauration
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🚨 Aucun JWT valide, redirection vers login !");
    return router.replace("/login");
  }

  console.log("✅ JWT valide, initialisation complète !");
  
  // ✅ Monter l'application après tout ça
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");

  console.log("✅ Application montée !");
}

initApp();

export default router;
