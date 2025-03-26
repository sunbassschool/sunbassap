import { createRouter, createWebHistory } from "vue-router";
import * as api from "@/utils/api.ts";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
// Importation des vues
import HomeView from "@/views/HomeView.vue";
import IntroView from "@/views/IntroView.vue";
import Dashboard from "@/views/Dashboard.vue";
import Partitions from "@/views/Partitions.vue";
import Planning from "@/views/Planning.vue";
import Replay from "@/views/Replay.vue";
import Videos from "@/views/Videos.vue";
import Cours from "@/views/Cours.vue";
import Register from "@/views/Register.vue";
import Login from "@/views/Login.vue";
import MonEspace from "@/views/MonEspace.vue";
import RegisterForm from "@/views/RegisterForm.vue";
import Prendreuncours from "@/views/Prendreuncours.vue";
import RegisterCursus from "@/views/RegisterCursus.vue";
import CreatePlanning from "@/views/CreatePlanning.vue";
import ForgotPassword from "@/views/ForgotPassword.vue";
import ResetPassword from "@/views/resetPassword.vue";

// Importation des fonctions utiles
import {
  verifyIndexedDBSetup,
  restoreTokensIfNeeded,
  getValidToken,
  isRefreshingNow,
} from "@/utils/api.ts";

// Gestion de l’état d'authentification
let authCheckInProgress = false;
let refreshInProgress: Promise<string | null> | null = null;

const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";

const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: "/", redirect: { name: "intro" } },
    { path: "/register-cursus", name: "RegisterCursus", component: RegisterCursus, meta: { requiresAuth: true, role: "admin" } },
    { path: "/reset-password", name: "Resetpassword", component: ResetPassword },
    { path: "/forgot-password", name: "Forgotpassword", component: ForgotPassword },
    { path: "/Createplanning", name: "CreatePlanning", component: CreatePlanning, meta: { requiresAuth: true, role: "admin" } },
    { path: "/cours", name: "cours", component: Cours, meta: { requiresAuth: true, role: "admin" } },
    { path: "/mon-espace", name: "mon-espace", component: MonEspace, meta: { requiresAuth: true } },
    { path: "/intro", name: "intro", component: IntroView },
    { path: "/home", name: "home", component: HomeView },
    { path: "/partitions", name: "partitions", component: Partitions },
    { path: "/register", name: "register", component: Register },
    { path: "/registerform", name: "registerform", component: RegisterForm },
    { path: "/planning", name: "planning", component: Planning, meta: { requiresAuth: true } },
    { path: "/replay", name: "replay", component: Replay, meta: { requiresAuth: true } },
    { path: "/videos", name: "videos", component: Videos },
    { path: "/dashboard", name: "dashboard", component: Dashboard, meta: { requiresAuth: true } },
    { path: "/login", name: "login", component: Login },
    { path: "/prendreuncours", name: "prendreuncours", component: Prendreuncours },
  ],
});
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inconnue est survenue.";
}
// 🚀 Vérifier l'authentification avant chaque navigation
router.beforeEach(async (to, from, next) => {
  if (authCheckInProgress) {
      console.warn("⚡ Vérification déjà en cours, on passe...");
      return next();
  }

  authCheckInProgress = true;

  if (!to.meta.requiresAuth) {
      authCheckInProgress = false;
      return next();
  }

  try {
      // ✅ Vérifier si IndexedDB est bien prêt
      const isDBReady = await verifyIndexedDBSetup();
      if (!isDBReady) {
          console.warn("⚠️ IndexedDB non prête !");
          authCheckInProgress = false;
          return next("/login");
      }

      let jwt = await getValidToken();

      // 🔄 **Si aucun JWT et un refresh est déjà en cours, on attend avant de rediriger !**
      if (!jwt && isRefreshingNow) {
          console.warn("🔄 Refresh en cours, on attend avant de rediriger...");

          // **Tentative d'attente du refresh du JWT (max 6s)**
          try {
              jwt = await new Promise((resolve) => {
                  const checkInterval = setInterval(async () => {
                      if (!isRefreshingNow) {
                          clearInterval(checkInterval);
                          resolve(await getValidToken());
                      }
                  }, 500);

                  setTimeout(() => {
                      clearInterval(checkInterval);
                      resolve(null); // Timeout
                  }, 6000);
              });
          } catch (e) {
              console.warn("⚠️ Impossible d'attendre un JWT valide !");
          }
      }

      // ✅ **Si JWT valide après refresh, continuer la navigation**
      if (jwt) {
          console.log("✅ JWT valide, accès autorisé.");
          authCheckInProgress = false;
          hideLoadingScreen();
          return next();
      }

      // 🚨 **Si toujours pas de JWT, on redirige vers login**
      console.warn("🚨 Aucun JWT valide après attente, redirection vers login !");
      authCheckInProgress = false;
      hideLoadingScreen();
      return next("/login");

  } catch (error) {
      console.error("❌ Erreur lors de la vérification d'authentification :", extractErrorMessage(error));
      authCheckInProgress = false;
      hideLoadingScreen();
      return next("/login");
  }
});

// ✅ Fonction pour masquer l’écran de chargement après l’authentification
function hideLoadingScreen() {
  setTimeout(() => {
      const loadingScreen = document.getElementById("loading-screen");
      if (loadingScreen) {
          loadingScreen.style.opacity = "0";
          setTimeout(() => (loadingScreen.style.display = "none"), 500);
      }
  }, 500);
}

    
});
// 🚀 Initialisation de l'application
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

  console.log("🔄 Restauration des tokens en cours...");
  await restoreTokensIfNeeded();

  // ✅ Vérifier le JWT après restauration
  const jwt = await getValidToken();
  if (!jwt) {
    console.warn("🚨 Aucun JWT valide, redirection vers login !");
    await router.replace("/login");
    return;
  }

  
  // ✅ Monter l'application uniquement après tout ça
  app.mount("#app");

  console.log("✅ Application montée !");
}

initApp();

export default router;
