import { createRouter, createWebHistory } from "vue-router";
import * as api from "@/utils/api.ts"; // Importation des fonctions API

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
  restoreJwt,
  isJwtExpired,
  getRefreshTokenFromDB,
  verifyIndexedDBSetup,
  getUserRole,
  refreshToken,
  getToken
} from "@/utils/api.ts";

// Gestion de l’état d'authentification
let refreshInProgress: Promise<string | null> | null = null;
let authCheckInProgress = false;

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

router.beforeEach(async (to, from, next) => {
  console.count("🔍 Auth Check - Router");

  let jwt = await getToken();
  let refreshToken = await getRefreshTokenFromDB();

  if (!jwt && !refreshToken) {
    console.warn("🚨 Aucun JWT ni refreshToken, l'utilisateur est juste non connecté.");
    
    if (to.path === "/login") {
      return next();
    }

    return next("/login");
  }

  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide, accès autorisé.");
    if (to.path === "/login") {
      return next("/dashboard");
    }
    return next();
  }

  if (refreshToken) {
    try {
      console.log("🔄 Tentative de rafraîchissement du JWT...");
      const newJwt = await refreshToken();
      if (newJwt) {
        console.log("✅ JWT rafraîchi avec succès !");
        sessionStorage.setItem("jwt", newJwt);
        if (to.path === "/login") {
          return next("/dashboard");
        }
        return next();
      }
    } catch (error) {
      console.error("❌ Erreur lors du refresh :", error);
    }
  }

  console.error("❌ JWT expiré et aucun refreshToken, redirection vers /login !");
  return next("/login");
});





export default router;
