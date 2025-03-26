<template>
  <div class="layout-container">
  

<!-- ✅ Menu latéral gauche (style Spotify) -->

<aside class="sidebar" :class="{ isCollapsed: isSidebarCollapsed }" v-if="!isMobile">


    
  <div class="sidebar-logo">
    <img :src="logoUrl" alt="Logo SunBassSchool" class="sidebar-main-logo">
  </div>

  
  <nav class="sidebar-nav">

  <a class="sidebar-link btn-cours" 
   href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/" 
   target="_blank" 
   rel="noopener noreferrer">
  <i class="bi bi-play-circle"></i>
  <span>Prendre un cours</span>
</a>

   <router-link class="sidebar-link" to="/dashboard">
      <i class="bi bi-house-door"></i>
      <span>Accueil</span>
    </router-link>
 <router-link v-if="!isLoggedIn" to="/registerform" class="sidebar-link">
  <i class="bi bi-person-plus"></i>
  <span>S'inscrire</span>
</router-link>
 

    <router-link class="sidebar-link" to="/partitions">
      <i class="bi bi-music-note-beamed"></i>
      <span>Partitions</span>
    </router-link>
   

    <router-link v-if="isLoggedIn" class="sidebar-link" to="/mon-espace">

  <i class="bi bi-person-circle"></i>
  <span>Mon Espace</span>
</router-link>


    <router-link class="sidebar-link" to="/videos">
      <i class="bi bi-film"></i>
      <span>Vidéos</span>
    </router-link>

    <router-link class="sidebar-link" v-if="isLoggedIn" to="/planning">

  <i class="bi bi-calendar-check"></i>
  <span>Plannings</span>
</router-link>

<router-link class="sidebar-link" v-if="isLoggedIn" to="/replay">

  <i class="bi bi-play-btn"></i>
  <span>Replay</span>
    </router-link>

    <router-link v-if="isAdmin" to="/CreatePlanning" class="sidebar-link">
  <i class="bi bi-pencil-square"></i>
  <span>Créer planning de l'élève</span>
</router-link>
    <router-link v-if="isAdmin" to="/register-cursus" class="sidebar-link">
  <i class="bi bi-person-add"></i>
  <span>Ajouter un élève</span>
</router-link>
  
<router-link v-if="isAdmin" to="/cours" class="sidebar-link">
 <i class="bi bi-tools"></i>
  <span>Gestion des cours</span>
</router-link>

<button v-if="isLoggedIn && isMobile" @click="logout" class="sidebar-link logout">


      <i class="bi bi-box-arrow-right"></i>
      <span>Déconnexion</span>
    </button>
  </nav>
</aside>
 <!-- ✅ Bouton pour afficher/masquer la sidebar -->
 <button class="toggle-menu-btn" v-if="!isMobile" @click="toggleSidebar">
  <i :class="isSidebarCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
</button>


    <!-- ✅ Bandeau principal -->
    <header class="hero-banner">
      <div class="hero-content">
        <!-- ✅ Logo pour Desktop -->
        <img v-if="!isMobile" :src="logoUrl" alt="Logo SunBassSchool" class="logo" />

        <!-- ✅ Logo Responsive si l'utilisateur n'est pas connecté -->
        <img v-if="showResponsiveLogo" :src="logoUrl" alt="Logo SunBassSchool" class="logo responsive-logo" />

        <!-- ✅ Menu Hamburger en Responsive -->
        <button class="menu-btn" v-if="isMobile&&isLoggedIn" @click="toggleMenu">
          <i class="bi bi-list"></i>
        </button>

        <!-- ✅ Bouton Installer PWA -->
        <button v-if="showInstallButton" @click="installPWA" class="install-btn" title="Installer SunBassAPP">
          📥
        </button>

        <!-- ✅ Section centrale -->
        <div class="hero-text">
          <h1 class="hero-title">SunBassAPP</h1>
          <p class="hero-subtitle">L'école de basse en ligne qui groove !</p>
        </div>
        <!-- ✅ Boutons supplémentaires pour desktop -->  
      
<div v-if="!isLoggedIn && !isMobile" class="desktop-auth-buttons">
  <router-link to="/login" class="btn-auth login-btn">Se connecter</router-link>

  <router-link to="/registerform" class="btn-auth trial-btn">Essai Gratuit</router-link>


</div>   
<div class="desktop-auth-buttons">
  <button v-if="isLoggedIn && !isMobile" @click="logout" class="sidebar-link logout">

  <i class="bi bi-box-arrow-right"></i>
  <span>Déconnexion</span>
</button>
     </div> <!-- Fin de .hero-content -->

        <!-- ✅ Boutons uniquement si connecté -->
        
      </div>
    </header>

    <!-- ✅ Menu latéral -->
    <div v-if="showMenu" class="menu-overlay" @click="toggleMenu"></div>
    <div class="mobile-menu" :class="{ 'active': showMenu }">
      <router-link to="/mon-espace" class="nav-link mon-espace" v-if="isLoggedIn">

        <i class="bi bi-person-circle"></i>
        <span>Mon Espace</span>
      </router-link>
     <a class="sidebar-link btn-cours" 
   href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/" 
   target="_blank" 
   rel="noopener noreferrer">
  <i class="bi bi-play-circle"></i>
  <span>Prendre un cours</span>
</a>

<router-link v-if="isAdmin" to="/CreatePlanning" class="nav-link mon-espace">
  <i class="bi bi-pencil-square"></i>
  <span>Créer le planning de l'élève</span>
</router-link>
<router-link v-if="isAdmin" to="/register-cursus" class="nav-link mon-espace">
  <i class="bi bi-calendar-event"></i>
  <span>Ajouter un élève</span>
</router-link>
<router-link v-if="isAdmin" to="/cours" class="nav-link mon-espace">📚 Cours</router-link>



<button v-if="isLoggedIn" @click="logout" class="nav-link logout">

        <i class="bi bi-box-arrow-right"></i> 
        <span>Déconnexion</span>
        
        
      </button>
    </div>

    <!-- ✅ Contenu principal --><div v-if="refreshFailed" class="error-message">
  ⚠️ Session expirée, veuillez vous reconnecter.
</div>
 
 <main class="page-content fullwidth">

  <div v-if="isRefreshing" class="loading">
    🔄 Rafraîchissement en cours...
  </div>

  <transition name="slide" mode="out-in">
  <div>
    <slot></slot>
  </div>
</transition>

</main>


    <!-- ✅ Menu de navigation en bas -->
    <footer class="navbar-container">

      <nav class="navbar">
        <ul class="navbar-nav">
          <li class="nav-item">
            <router-link class="nav-link" to="/dashboard">
              <i class="bi bi-house-door"></i>
              <span>Home</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link" to="/partitions">
              <i class="bi bi-music-note-beamed"></i>
              <span>Partitions</span>
            </router-link>
          </li>
          <router-link v-if="!isLoggedIn" to="/registerform" class="nav-link btn-register">
  <i class="bi bi-person-plus"></i>
  <span>S'inscrire</span>
</router-link>

          <!-- ✅ Planning et Replay uniquement si connecté -->
          <li v-if="isLoggedIn" class="nav-item">

            <router-link class="nav-link" to="/planning">
              <i class="bi bi-calendar-check"></i>
              <span>Plannings</span>
            </router-link>
          </li>
          <li v-if="isLoggedIn" class="nav-item">

            <router-link class="nav-link" to="/replay">
              <i class="bi bi-play-btn"></i>
              <span>Replay</span>
            </router-link>
          </li>

          <li class="nav-item">
            <router-link class="nav-link" to="/videos">
              <i class="bi bi-film"></i>
              <span>Vidéos</span>
            </router-link>
          </li>
        </ul>
      </nav>
      <!-- ✅ Boutons Réseaux Sociaux -->

<!-- ✅ Boutons Réseaux Sociaux - Affichés uniquement en mode Desktop -->
<div class="social-buttons">
  <a href="https://www.facebook.com/SunBassSchool" target="_blank" class="social-link facebook">
    <i class="bi bi-facebook"></i>
  </a>
  <a href="https://www.instagram.com/SunBassSchool" target="_blank" class="social-link instagram">
    <i class="bi bi-instagram"></i>
  </a>
  <a href="https://www.youtube.com/SunBassSchool" target="_blank" class="social-link youtube">
    <i class="bi bi-youtube"></i>
  </a>
  <a href="https://www.tiktok.com/@SunBassSchool" target="_blank" class="social-link tiktok">
    <i class="bi bi-tiktok"></i>
  </a>
</div>

    </footer>
    
  </div>


</template>




<script>
import { jwtDecode } from "jwt-decode";
import { ref, watchEffect, onMounted, nextTick, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { watch } from "vue";
import { refreshToken } from '@/utils/api.ts';
import {  getToken, isUserLoggedIn, isUserAdmin, clearUserData, restoreTokensToIndexedDB, setTokenCookies, logoutUser,    } from "@/utils/api.ts";

export default {
  name: "Layout",
  setup() {
    
    const router = useRouter();
    let refreshInterval; // ✅ Déclaration ici
    // 🔥 Déclaration des variables réactives
    const user = ref(null);
    const isLoggedIn = ref(false);
    const showResponsiveLogo = ref(false);

    const isAdmin = ref(false);
    const refreshKey = ref(0); // 🔥 Clé pour forcer le re-render des composants

    
    const isRefreshing = ref(false);
    const refreshFailed = ref(false);
    const isMobile = ref(window.innerWidth < 768);
    const showMenu = ref(false);
    const isSidebarCollapsed = ref(false);
    const showInstallButton = ref(false);
    const deferredPrompt = ref(null);
    const checkInstallAvailability = () => {
  if (deferredPrompt.value) {
    showInstallButton.value = true; // 🔄 Réactive le bouton après connexion
  }
};
    const logoUrl = `${import.meta.env.BASE_URL}images/logo.png`;

    // ✅ Fonction pour vérifier l'état de connexion
// Vérifier l'état de la connexion et rediriger si nécessaire
const checkLoginStatus = async () => {
  console.log("🚀 checkLoginStatus() appelé !");
  let token = await getToken();
  nextTick(() => {
    if (!token && isLoggedIn.value) {
      console.log("🔄 L'utilisateur a été déconnecté, redirection vers Dashboard");
    }
  });

  isLoggedIn.value = !!token;
  isAdmin.value = isUserAdmin();
};

window.addEventListener("appinstalled", () => {
  console.log("✅ PWA installée !");
  showInstallButton.value = false;
});

function isJwtExpired(token) {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp ? decoded.exp * 1000 < Date.now() : true;
  } catch {
    return true;
  }
}

;


    // ✅ Rafraîchir le JWT et mettre à jour l'affichage immédiatement
    const handleTokenRefresh = async () => {
  console.log("🔄 Tentative de rafraîchissement du JWT...");
  if (await refreshToken()) {
    isLoggedIn.value = true;
    isAdmin.value = isUserAdmin();
  } else {
    console.warn("❌ Échec du refresh token, l’utilisateur doit se reconnecter.");
    isLoggedIn.value = false;
  }
  isRefreshing.value = false;
};








    // ✅ Surveiller `isLoggedIn` et forcer l'affichage en temps réel
 

 









      // ✅ Détection de changement de connexion sur d'autres onglets
      window.addEventListener("storage", async (event) => {
        if (event.key === "jwt") {
          console.log("🔄 Changement détecté dans `localStorage` !");
          await checkLoginStatus();
        }
      });

      // ✅ Gestion de l'installation de la PWA
      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt.value = event;
        showInstallButton.value = true;
      });




 
    

    // ✅ Vérification de la taille d'écran
    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 1024;
      console.log("📱 isMobile :", isMobile.value);
    };
    const handleBeforeInstallPrompt = (event) => {
  event.preventDefault();
  deferredPrompt.value = event;
  showInstallButton.value = true;
};

onMounted(async () => {
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

  checkInstallAvailability();
  console.log("✅ Vérification de la disponibilité d'IndexedDB...");

await restoreTokensToIndexedDB(); // 🔥 Restaure les tokens si nécessaire
  console.log("✅ Vérification du JWT...");
  let token = await getToken();
  isLoggedIn.value = !!token;
  isAdmin.value = isUserAdmin();

  if (token) {
    const decoded = jwtDecode(token);
    const timeLeft = (decoded.exp * 1000 - Date.now()) * 0.9; // Refresh à 90% de l’expiration
    refreshInterval = setTimeout(handleTokenRefresh, Math.max(timeLeft, 300000)); // Min 5 min
  }

  window.addEventListener("resize", checkMobile);
  checkMobile();
});


; // ✅ FERMETURE MANQUANTE
onUnmounted(() => {
  console.log("🚨 Nettoyage au démontage : arrêt du refresh interval");
  clearTimeout(refreshInterval);

  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.removeEventListener("storage", checkLoginStatus); // ✅ Suppression propre
});


    // ✅ Déconnexion utilisateur

  

    async function logout() {
  console.log("🚨 Déconnexion en cours via api.ts...");

  try {
    await logoutUser(); // ✅ Déconnecte l'utilisateur

    // ✅ Forcer la mise à jour de l'état de connexion
    isLoggedIn.value = false;
    isAdmin.value = false;

    console.log("✅ Déconnexion terminée, rechargement...");
    setTimeout(() => {
      location.reload(); // ✅ Recharge la page après 200ms
    }, 200);
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
  }
}




;




    // ✅ Suppression des tokens dans IndexedDB
    const clearIndexedDB = async () => {
      if (!indexedDB.databases) return;

      try {
        const databases = await indexedDB.databases();
        await Promise.all(databases.map(db => indexedDB.deleteDatabase(db.name)));
        console.log("✅ IndexedDB vidé !");
      } catch (error) {
        console.error("❌ Erreur lors de la suppression d'IndexedDB :", error);
      }
    };

    // ✅ Suppression des Service Workers
    const unregisterServiceWorkers = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log("✅ Service Workers désinscrits !");
      } catch (error) {
        console.error("❌ Erreur lors de la désinscription des Service Workers :", error);
      }
    };

    // ✅ Installation de la PWA
    const installPWA = () => {
      if (deferredPrompt.value) {
        deferredPrompt.value.prompt();
        deferredPrompt.value.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("✅ L'utilisateur a installé l'application.");
          } else {
            console.log("❌ L'utilisateur a refusé.");
          }
          deferredPrompt.value = null;
        });
      } else {
        console.warn("🚨 L'événement beforeinstallprompt n'a pas été déclenché.");
      }
    };

    // ✅ Basculer le menu latéral
    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    // ✅ Basculer le menu mobile
    const toggleMenu = () => {
      showMenu.value = !showMenu.value;
    };

    return {
      user,
      isLoggedIn,
      isAdmin,
      refreshKey,
      isRefreshing,
      refreshFailed,
      isMobile,
      showResponsiveLogo ,
      showMenu,
      isSidebarCollapsed,
      showInstallButton,
      deferredPrompt,
      logoUrl,
      
      handleTokenRefresh,
      logout,
      clearIndexedDB,
      unregisterServiceWorkers,
      installPWA,
      toggleSidebar,
      toggleMenu,
      checkMobile
    };
  }
};
</script>







<style scoped>
/* ✅ STYLES GÉNÉRAUX */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

*::-webkit-scrollbar {
  width: 10px;
}

*::-webkit-scrollbar-track {
  background: #0a0a0a;
  border-radius: 10px;
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 0, 0, 0.7), rgba(255, 120, 0, 0.7));
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(255, 69, 0, 0.75);
}

*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255, 0, 0, 1), rgba(255, 120, 0, 1));
}

/* ✅ MENU LATÉRAL (Sidebar) */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 250px;
  height: 100vh;
  background: #121212;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1100;
  overflow-y: auto;
  transition: transform 0.4s ease-in-out;
}

.sidebar.isCollapsed {
  width: 10px;
  transform: translateX(-100%);
}

/* ✅ BOUTON TOGGLE SIDEBAR */
.toggle-menu-btn {
  position: absolute;
  top: 50%;
  left: 252px;
  transform: translateY(-50%);
  width: 18px;
  height: 120px;
  background: #2b2b2b;
  border: none;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  z-index: 1200;
}

.toggle-menu-btn:hover {
  background: #b9360a;
  box-shadow: none;
}

.sidebar.isCollapsed + .toggle-menu-btn {
  left: 20px;
}

/* ✅ NAVIGATION SIDEBAR */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  border-radius: 8px;
  color: #b3b3b3;
  font-size: 18px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease-in-out;
}

.sidebar-link:hover,
.sidebar-link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ✅ CONTENU PRINCIPAL */
.page-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: rgba(3, 1, 1, 0.801);
  min-height: 100vh;
  transition: margin-left 0.3s ease-in-out;
}

.sidebar:not(.isCollapsed) ~ .page-content {
  margin-left: 250px;
}

/* ✅ HEADER */
.hero-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 120px;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 1050;
  padding: 0 20px;
}

.hero-content {
  display: flex;
  align-items: center;
  width: 65%;
  max-width: 1200px;
}

.hero-title {
  font-family: "Poppins", sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
  text-shadow: 0px 3px 15px rgba(255, 255, 255, 0.3);
}

.hero-subtitle {
  font-size: 1.2rem;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  text-align: center;
  opacity: 0.9;
}

/* ✅ NAVIGATION BAS DE PAGE */
.navbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* ✅ RESPONSIVE DESIGN */
@media screen and (max-width: 1024px) {
  .sidebar {
    display: none;
  }

  .page-content {
    margin-left: 0;
  }

  .navbar-container {
    height: 70px;
  }

  .navbar-nav .nav-link {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .hero-banner {
    height: 80px;
  }
}

@media screen and (min-width: 1025px) {
  .navbar-container {
    display: none !important;
  }
}

/* ✅ TRANSITIONS */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.5s ease-in-out;
}

.slide-enter {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* ✅ LOADING SCREEN */
.loading-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
}

.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}


</style>