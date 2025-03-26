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
import Metronome from '@/views/Metronome.vue';
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
    { path: "/Metronome", name: "Metronome", component: Metronome},
  ],
});
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inconnue est survenue.";
}
// 🚀 Vérifier l'authentification avant chaque navigation
// 🚀 Vérifier l'authentification avant chaque navigation
router.beforeEach(async (to, from, next) => {
  if (authCheckInProgress) {
    console.warn("⚡ Vérification déjà en cours, on passe...");
    return next();
  }

  authCheckInProgress = true;

  // Vérifier si la route nécessite une authentification
  if (!to.meta.requiresAuth) {
    authCheckInProgress = false;
    console.log("🔓 Accès à une page publique :", to.fullPath);
    return next(); // ✅ Stoppe l'authentification ici !
  }


  // Enregistrer la route actuelle avant de tenter un refresh
  if (to.meta.requiresAuth) {
    sessionStorage.setItem("redirectAfterRefresh", to.fullPath); // Sauvegarder la route actuelle avant d'attendre un refresh
  }

  try {
    // Vérifier si IndexedDB est prête
    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête !");
      authCheckInProgress = false;
      return next("/login");
    }

    let jwt = await getValidToken();

    // Si aucun JWT et un refresh est déjà en cours, on attend avant de rediriger
    if (!jwt && isRefreshingNow) {
      console.warn("🔄 Refresh en cours, on attend avant de rediriger...");

      // Tentative d'attente pour 6 secondes du refresh
      jwt = await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          if (!isRefreshingNow) {
            clearInterval(checkInterval);
            resolve(await getValidToken());
          }
        }, 500);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null); // Timeout après 6 secondes
        }, 6000); // Si le refresh prend plus de 6 secondes
      });
    }

    // Si le JWT est valide après rafraîchissement, continuer la navigation
    if (jwt) {
      console.log("✅ JWT valide, accès autorisé.");

      // Si un refresh a été effectué, rediriger vers la page où l'utilisateur était
      const previousRoute = sessionStorage.getItem("redirectAfterRefresh");

      if (previousRoute) {
        sessionStorage.removeItem("redirectAfterRefresh");
        console.log(`🔄 Redirection vers la route: ${previousRoute}`);
        return next(previousRoute); // Rediriger vers la page d'origine
      }

      authCheckInProgress = false;
      hideLoadingScreen();
      return next();
    }

    // Si toujours pas de JWT, redirige vers /login
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


    



export default router;
