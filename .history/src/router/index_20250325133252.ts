import { createRouter, createWebHistory } from "vue-router";
import {
  getValidToken,
  isRefreshingNow,
  extractErrorMessage
} from "@/utils/api.ts";

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

// Cache d'authentification
let lastAuthCheck: number | null = null;
let authCheckInProgress = false;

const router = createRouter({
  history: createWebHistory(import.meta.env.MODE === "production" ? "/app/" : "/"),
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

router.beforeEach(async (to) => {
  console.log(`🛣️ Route: ${to.path}`);

  // 1. Accès public immédiat
  if (!to.meta.requiresAuth) {
    return true;
  }

  // 2. Utilisation du cache si valide (5 secondes)
  if (lastAuthCheck && Date.now() - lastAuthCheck < 5000) {
    console.log("🔁 Utilisation du cache d'authentification");
    return true;
  }

  // 3. Protection contre les vérifications parallèles
  if (authCheckInProgress) {
    console.log("⏳ Authentification déjà en cours...");
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  authCheckInProgress = true;

  try {
    // 4. Vérification du token
    let token = await getValidToken();

    // 5. Attente si refresh en cours
    if (!token && isRefreshingNow) {
      console.log("🔄 Attente du rafraîchissement du token...");
      token = await new Promise((resolve) => {
        const interval = setInterval(async () => {
          if (!isRefreshingNow) {
            clearInterval(interval);
            resolve(await getValidToken());
          }
        }, 300);
      });
    }

    if (token) {
      lastAuthCheck = Date.now();
      return true;
    }

    console.warn("🔒 Redirection vers /login");
    return "/login";
  } catch (error) {
    console.error("❌ Erreur:", extractErrorMessage(error));
    return "/login";
  } finally {
    authCheckInProgress = false;
  }
});

// Masquage progressif du loading screen
window.addEventListener('load', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
  }
});

export default router;