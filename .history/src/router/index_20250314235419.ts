import { createRouter, createWebHistory } from 'vue-router';
import * as api from '@/utils/api.ts';  // Importation de toutes les fonctions utiles depuis api.ts

// Importation des vues
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
import ForgotPassword from '@/views/ForgotPassword.vue';
import ResetPassword from '@/views/resetPassword.vue';

// Importation des fonctions
import { restoreJwt, isJwtExpired, getRefreshTokenFromDB, getUserRole, refreshToken,  } from '@/utils/api.ts';

// Gestion de l’état d'authentification
let refreshInProgress: Promise<string | null> | null = null;
let authPromise: Promise<string | null> | null = null;
let authCheckInProgress = false;

const baseUrl = import.meta.env.MODE === 'production' ? '/app/' : '/';

const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    { path: '/', redirect: { name: 'intro' } },
    { path: '/register-cursus', name: 'RegisterCursus', component: RegisterCursus, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/reset-password', name: 'Resetpassword', component: ResetPassword },
    { path: '/forgot-password', name: 'Forgotpassword', component: ForgotPassword },
    { path: '/Createplanning', name: 'CreatePlanning', component: CreatePlanning, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/cours', name: 'cours', component: Cours, meta: { requiresAuth: true, role: 'admin' } },
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

router.beforeEach(async (to, from, next) => {
  console.count("🔍 Auth Check - Router");

  if (authCheckInProgress) {
    console.warn("⚡ Vérification déjà en cours, on passe...");
    return next();
  }

  authCheckInProgress = true;

  // Sauvegarde de la page demandée si l'utilisateur doit se connecter
  if (to.meta.requiresAuth) {
    sessionStorage.setItem("redirectAfterLogin", to.fullPath);
  }

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  // 🔄 Tentative de récupération si JWT absent
  if (!jwt) {
    console.log("🔄 Aucun JWT trouvé, tentative de récupération...");

    if (!authPromise) {
      authPromise = restoreJwt();
    }
    jwt = await authPromise;
    authPromise = null;
  }

  // ✅ Si JWT valide, on continue
  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide, accès autorisé.");
    authCheckInProgress = false;

    // 🔍 Vérification des rôles si nécessaire
    if (to.meta.role) {
      const userRole = getUserRole(); // Appel sans argument
      if (userRole !== to.meta.role) {
        console.warn(`⛔ Accès refusé : rôle ${userRole} requis pour ${to.path}`);
        return next("/");
      }
    }

    return next();
  }

  // 🔄 Tentative de refresh si JWT expiré
  let storedRefreshToken = await getRefreshTokenFromDB(); // Renommé pour éviter collision de nom
  if (!storedRefreshToken) {
    console.warn("🚨 Aucun refresh token, redirection vers /login !");
    authCheckInProgress = false;

    // **Empêche la boucle infinie en vérifiant si on est déjà sur /login**
    if (to.path !== "/login" && from.path !== "/login") {
      return next("/login");
    }
    return next();
  }

  try {
    if (!refreshInProgress) {
      refreshInProgress = refreshToken(); // Appel correct de refreshToken
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

    // **Empêche la boucle infinie vers /login**
    if (to.path !== "/login" && from.path !== "/login") {
      return next("/login");
    }
    return next();
  }

  authCheckInProgress = false;
});

export default router;
