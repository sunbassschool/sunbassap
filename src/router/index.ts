import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import IntroView from '@/views/IntroView.vue'
import Dashboard from '@/views/Dashboard.vue'
import Partitions from '@/views/Partitions.vue'
import Planning from '@/views/Planning.vue'
import Replay from '@/views/Replay.vue'
import Videos from '@/views/Videos.vue'
import Register from '@/views/Register.vue'
import Login from '@/views/Login.vue'
import MonEspace from '@/views/MonEspace.vue'
import RegisterForm from '@/views/RegisterForm.vue'
import Prendreuncours from '@/views/Prendreuncours.vue'
import RegisterCursus from "../views/RegisterCursus.vue"
import CreatePlanning from "@/views/CreatePlanning.vue";
import { refreshToken } from '@/utils/api.js'

const baseUrl = import.meta.env.MODE === "production" ? "/app/" : "/";
function getUserRole() {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split(".")[1])); // Décoder le JWT
        console.log("🎫 JWT Payload :", payload); // ✅ Vérifie le rôle dans la console
        return payload.role || null; // Retourne le rôle ou null si non défini
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du rôle :", error);
        return null;
    }
}

const router = createRouter({
  history: createWebHistory(baseUrl),
  routes: [
    {
      path: '/',
      redirect: { name: 'intro' }
    },
    {
      path: "/register-cursus",
      name: "RegisterCursus",
      component: RegisterCursus,
    },
    {
      path: "/create-planning",
      name: "CreatePlanning",
      component: () => import("@/views/CreatePlanning.vue"),
      meta: { requiresAuth: true, role: "admin" } // ✅ Seuls les admins peuvent y accéder
    },
    
    
    {
      path: '/mon-espace',
      name: 'mon-espace',
      component: MonEspace,
      meta: { requiresAuth: true }
    },
    {
      path: '/intro',
      name: 'intro',
      component: IntroView,
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/partitions',
      name: 'partitions',
      component: Partitions,
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
    },
    {
      path: '/registerform',
      name: 'registerform',
      component: RegisterForm,
    },
    {
      path: '/planning',
      name: 'planning',
      component: Planning,
      meta: { requiresAuth: true }
    },
    {
      path: '/replay',
      name: 'replay',
      component: Replay,
      meta: { requiresAuth: true }
    },
    {
      path: '/videos',
      name: 'videos',
      component: Videos,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/prendreuncours',
      name: 'prendreuncours',
      component: Prendreuncours,
    },
  ],
});

// **🚀 Middleware global pour protéger les routes nécessitant l'authentification**
router.beforeEach(async (to, from, next) => {
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let refreshjwt = localStorage.getItem("refreshjwt");

  console.log("🔍 Vérification de l'authentification...");

  if (to.meta.requiresAuth) {
    if (!jwt) {
      if (refreshjwt) {
        console.warn("⚠️ JWT expiré, tentative de rafraîchissement...");
        jwt = await refreshToken();
        if (!jwt) {
          console.error("🚨 Refresh échoué, redirection vers /login");
          return next('/login');
        }
      } else {
        console.error("🚨 Aucun JWT valide, redirection vers /login !");
        return next('/login');
      }
    }
  }

  // 🔒 Vérification du rôle si nécessaire
  if (to.meta.role) {
    const userRole = getUserRole();
    if (userRole !== to.meta.role) {
      console.error(`🚫 Accès refusé, rôle requis : ${to.meta.role}, votre rôle : ${userRole}`);
      return next('/'); // Redirection sécurisée
    }
  }

  return next();
});



export default router;
