import { createRouter, createWebHistory } from "vue-router";
import * as api from "@/utils/api.ts"; // Importation des fonctions API
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue"; // Vérifie que le chemin est correct
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
  restoreTokensIfNeeded,
  refreshToken,
  getToken,
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

// ✅ Vérification avant chaque navigation
router.beforeEach(async (to, from, next) => {
  console.count("🔍 Auth Check - Router");

  if (authCheckInProgress) {
    console.warn("⚡ Vérification déjà en cours, on passe...");
    return next();
  }
  authCheckInProgress = true;

  // 🚫 Empêche toute vérification si l'utilisateur vient de se déconnecter
  if (refreshInProgress === Promise.resolve(null)) {
    console.warn("🚨 Déconnexion en cours, on bloque les vérifications !");
    authCheckInProgress = false;
    return next("/login");
  }

  if (!to.meta.requiresAuth) {
    authCheckInProgress = false;
    return next();
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  // ✅ Si le JWT est valide, accès immédiat
  if (jwt && !api.isJwtExpired(jwt)) {
    console.log("✅ JWT valide, accès autorisé.");
    authCheckInProgress = false;
    return next();
  }

  // 🔍 Récupération du refresh token
  let refreshToken = await api.getRefreshTokenFromDB();

  // ✅ **Si JWT encore valide mais refresh token manquant, tenter un refresh immédiat**
  if (jwt && api.isJwtExpired(jwt) && !refreshToken) {
    console.warn("⚠️ JWT valide mais pas de refresh token. Tentative de récupération...");
    refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    // 🚨 **Si on n'a toujours pas de refresh token, direction /login**
    if (!refreshToken) {
      console.warn("❌ Aucun refresh token disponible, redirection vers login.");
      authCheckInProgress = false;
      return next("/login");
    }
  }

  // 🚨 Si aucun refresh token n'est disponible, on redirige vers login
  if (!refreshToken) {
    console.warn("🚨 Aucun refresh token, redirection vers la page d’accueil !");
    authCheckInProgress = false;
    return next("/login");
  }

  try {
    if (!refreshInProgress) {
      refreshInProgress = api.refreshToken();
    }

    const newJwt = await refreshInProgress;
    refreshInProgress = null;

    if (newJwt) {
      console.log("✅ JWT rafraîchi avec succès !");
      sessionStorage.setItem("jwt", newJwt);
      authCheckInProgress = false;
      return next();
    }
  } catch (error) {
    console.error("❌ Erreur inattendue lors du refresh :", error);
    authCheckInProgress = false;
    return next("/login");
  }

  authCheckInProgress = false;
});

// ✅ Fonction pour initialiser l'application
async function initApp() {
  console.log("🚀 Initialisation de l'application...");
  const app = createApp(App);
  app.use(createPinia());

  // ✅ Attendre que IndexedDB soit prête
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non prête, récupération impossible !");
    return;
  }

  // ✅ Attendre la restauration des tokens avant d'initialiser le router
  console.log("🔄 Restauration des tokens...");
  await restoreTokensIfNeeded();

  // ✅ Charger le router après récupération des tokens
  app.use(router);
  app.mount("#app");

  const jwt = localStorage.getItem("jwt");
  if (jwt) {
    console.log("✅ JWT trouvé après restauration, l'utilisateur est connecté !");
  } else {
    console.warn("⚠️ Aucun JWT trouvé, redirection vers login.");
    router.replace("/login");
  }

  // ✅ Masquer l’écran de chargement après init
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
  }, 500);
}

export default router;
