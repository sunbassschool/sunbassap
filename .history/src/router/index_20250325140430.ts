import { createRouter, createWebHistory } from "vue-router";
import * as api from "@/utils/api.ts";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
// Importation des vues
import HomeView from "@/views/HomeView.vue";
import IntroView from "@/views/IntroView.vue";
import BassTuner from "@/views/BassTuner.vue";
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
    { path: "/", redirect: { name: "dashboard" } },
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
    { path: "/dashboard", name: "dashboard", component: Dashboard, meta: { requiresAuth: true }},
    { path: "/login", name: "login", component: Login },
    { path: "/prendreuncours", name: "prendreuncours", component: Prendreuncours },
    { path: "/Metronome", name: "Metronome", component: Metronome},
    { path: "/BassTuner", name: "BassTuner", component: BassTuner},
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
// ➡️ Ajoutez en haut du fichier :
let globalAuthChecked = false;

router.beforeEach(async (to) => {
  console.log("➡️ Navigation vers :", to.fullPath);

  // 1️⃣ Routes publiques : sortie immédiate
  if (!to.meta.requiresAuth) {
    console.log("🔓 Accès libre");
    return true;
  }

  // 2️⃣ Si déjà vérifié récemment (cache de 5s)
  if (globalAuthChecked && Date.now() - globalAuthChecked < 5000) {
    console.log("⚡ Utilisation du cache d'authentification");
    return true;
  }

  // 3️⃣ Logique existante...
  try {
    const jwt = await getValidToken();
    if (jwt) {
      globalAuthChecked = Date.now(); // 🔄 Marquer comme vérifié
      return true;
    }
    return "/login";
  } catch {
    return "/login";
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
