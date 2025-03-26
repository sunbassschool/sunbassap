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
  console.log("➡️ Navigation vers :", to.fullPath);

  // 🟢 Si la route n'a PAS besoin d'authentification, on autorise directement l'accès
  if (!to.meta.requiresAuth) {
    console.log("🔓 Page publique, accès direct !");
    return next();
  }

  console.log("🔐 Page protégée détectée, vérification du JWT...");

  if (authCheckInProgress) {
    console.warn("⚡ Vérification déjà en cours...");
    return next();
  }

  authCheckInProgress = true;

  try {
    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête, redirection !");
      authCheckInProgress = false;
      return next("/login");
    }

    let jwt = await getValidToken();
    console.log("🔑 JWT récupéré :", jwt);

    if (!jwt && isRefreshingNow) {
      console.warn("🔄 Attente du rafraîchissement du token...");
      jwt = await new Promise((resolve) => {
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
    }

    // 🛑 Si la page est protégée et qu'on a un JWT, on continue.
    if (jwt) {
      console.log("✅ JWT valide, accès autorisé.");
      authCheckInProgress = false;
      return next();
    }

    // 🚨 **Ne rediriger vers `/login` QUE si la page nécessite une auth !**
    if (to.meta.requiresAuth) {
      console.warn("🚨 Aucun JWT valide, redirection vers login !");
      authCheckInProgress = false;
      return next("/login");
    }

    console.log("🔓 Route publique malgré l'absence de JWT, accès autorisé.");
    authCheckInProgress = false;
    return next(); // ✅ Permet l'accès même sans JWT

  } catch (error) {
    console.error("❌ Erreur d'authentification :", extractErrorMessage(error));
    authCheckInProgress = false;

    // 🚨 **Ne rediriger vers `/login` QUE si la page nécessite une auth !**
    if (to.meta.requiresAuth) {
    
    }

    return next(); // ✅ Permet l'accès aux pages publiques
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
