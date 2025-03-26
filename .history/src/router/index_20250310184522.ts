import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import IntroView from '@/views/IntroView.vue';
import Dashboard from '@/views/Dashboard.vue';
import Partitions from '@/views/Partitions.vue';
import Planning from '@/views/Planning.vue';
import Replay from '@/views/Replay.vue';
import Videos from '@/views/Videos.vue';
import Cours from '@/views/Cours.vue';
import Register from '@/views/Register.vue';
import Login from '@/views/Login.vue';
import MonEspace from '@/views/MonEspace.vue';
import RegisterForm from '@/views/RegisterForm.vue';
import Prendreuncours from '@/views/Prendreuncours.vue';
import RegisterCursus from "@/views/RegisterCursus.vue";
import CreatePlanning from "@/views/CreatePlanning.vue";
import * as api from '@/utils/api.ts';
import ForgotPassword from '@/views/ForgotPassword.vue';
import ResetPassword from '@/views/resetPassword.vue';

let authChecked = false; 
let refreshInProgress: Promise<string | null> | null = null;

const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";

const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: '/', redirect: { name: 'intro' } },
    { path: "/register-cursus", name: "RegisterCursus", component: RegisterCursus, meta: { requiresAuth: true, role: "admin" } },
    { path: "/reset-password", name: "Resetpassword", component: ResetPassword },
    { path: "/forgot-password", name: "Forgotpassword", component: ForgotPassword },
    { path: "/Createplanning", name: "CreatePlanning", component: CreatePlanning, meta: { requiresAuth: true, role: "admin" } },
    { path: "/cours", name: "cours", component: Cours, meta: { requiresAuth: true, role: "admin" } },
    { path: '/mon-espace', name: 'mon-espace', component: MonEspace, meta: { requiresAuth: true } },
    { path: '/intro', name: 'intro', component: IntroView },
    { path: '/home', name: 'home', component: HomeView },
    { path: '/partitions', name: 'partitions', component: Partitions },
    { path: '/register', name: 'register', component: Register },
    { path: '/registerform', name: 'registerform', component: RegisterForm },
    { path: '/planning', name: 'planning', component: Planning, meta: { requiresAuth: true } },
    { path: '/replay', name: 'replay', component: Replay, meta: { requiresAuth: true } },
    { path: '/videos', name: 'videos', component: Videos },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: Login },
    { path: '/prendreuncours', name: 'prendreuncours', component: Prendreuncours },
  ],
});

// Middleware d'authentification
let authCheckInProgress = false;

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

  if (jwt && !api.isJwtExpired(jwt)) {
    console.log("✅ JWT valide, accès autorisé.");
    authCheckInProgress = false;
    return next();
  }

  // 🚨 Si le JWT est expiré et qu’on n'est pas en train de se déconnecter
  let refreshToken = await api.getRefreshTokenFromDB();
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


export default router;
