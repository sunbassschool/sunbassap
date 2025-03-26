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

<button v-if="isLoggedIn && isMobile" @click="logoutUser" class="sidebar-link logout">
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
  <button v-if="isLoggedIn && !isMobile" @click="logoutUser" class="sidebar-link logout">

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



<button v-if="isLoggedIn" @click="logoutUser" class="nav-link logout">

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
          <li v-show="isLoggedIn" class="nav-item">

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
import { ref, computed, onMounted, onUnmounted } from "vue"; // ✅ Ajout de computed
import { useRouter } from "vue-router";
import { isUserLoggedIn, isUserAdmin, logoutUser } from "@/utils/api.ts";

export default {
  name: "Layout",
  setup() {
    const router = useRouter();
    const isLoggedIn = ref(isUserLoggedIn());
    const isAdmin = ref(isUserAdmin());
    const isMobile = ref(window.innerWidth < 768);
    const showMenu = ref(false);
    const logoUrl = ref("/images/logo.png"); // ✅ Défini correctement ici
    const isSidebarCollapsed = ref(false);
    const showInstallButton = ref(false);
    const deferredPrompt = ref(null);
    const refreshFailed = ref(false); // ✅ Déclaration de `refreshFailed`
    const isRefreshing = ref(false); // ✅ Déclaration de `isRefreshing`
    // ✅ Correction : computed correctement importé
    const showResponsiveLogo = computed(() => isMobile.value);

    const checkInstallAvailability = () => {
      if (deferredPrompt.value) {
        showInstallButton.value = true;
      }
    };

    const toggleMenu = () => {
      showMenu.value = !showMenu.value;
    };

    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 1024;
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPrompt.value = event;
      showInstallButton.value = true;
    };

    onMounted(() => {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      checkInstallAvailability();
      window.addEventListener("resize", checkMobile);
      checkMobile();

      isLoggedIn.value = isUserLoggedIn();
      isAdmin.value = isUserAdmin();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    });

    const installPWA = () => {
      if (deferredPrompt.value) {
        deferredPrompt.value.prompt();
        deferredPrompt.value.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            console.log("✅ L'utilisateur a installé l'application.");
          }
          deferredPrompt.value = null;
        });
      }
    };

    return {
      isLoggedIn,
      isAdmin,
      isMobile,
      logoUrl, // ✅ Ajout ici
      showMenu,
      isSidebarCollapsed,
      showInstallButton,
      showResponsiveLogo, // ✅ Variable maintenant correcte
      toggleMenu,
      installPWA,
      logoutUser,
      refreshFailed, // ✅ Ajout dans `return`
      isRefreshing, // ✅ Ajout dans `return`
    };
  },
};

</script>








<style scoped>
/* ✅ Style général du menu latéral */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  background: #121212;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease-in-out; /* ✅ Animation fluide */
  z-index: 1100;
}

/* ✅ Mode réduit (caché) */
.sidebar.isCollapsed {
  width: 10px;
}

/* ✅ Bouton pour afficher/masquer la sidebar */
.toggle-menu-btn {
  position: absolute;
  top: 50%;
  left: 252px;
  transform: translateY(-50%);
  width: 18px;
  height: 120px;
  background: #2b2b2b; /* Orange vif */
  border: none;
  border-radius: 12px; /* Coins légèrement arrondis pour un effet moderne */
  display: flex;
  justify-content: center;
  align-items: center;
  color: rgb(255, 255, 255);
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  z-index: 1200;
}
.sidebar.isCollapsed {
  transform: translateX(-100%); /* ✅ Cache la sidebar en la déplaçant hors de l'écran */
}
.toggle-menu-btn i {
  font-size: 20px;
}

/* ✅ Hover */
.toggle-menu-btn:hover {
  background: #b9360a; /* Rouge foncé au hover */
  box-shadow: none;
}
/* ✅ Quand la sidebar est réduite, le bouton reste visible */

.sidebar.isCollapsed + .toggle-menu-btn {
  left: 20px; /* Ramène le bouton vers la gauche */
}





@media screen and (max-width: 1024px) {
  /* ✅ Correction pour l'affichage du menu hamburger */
  .mobile-menu {
    position: fixed;
    top: 80px; /* ✅ Ajusté pour ne pas être coupé par le header */
    left: 0;
    width: 100%;
    height: calc(100% - 80px); /* ✅ Prend tout l’espace sous le header */
    background: #000000;
    opacity: 95%; /* ✅ Améliorer la lisibilité */
    text-align: center;
    display: flex;
    
    flex-direction: column;
    padding: 20px;
    box-shadow: 4px 0px 10px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease-in-out;
    z-index: 999;
    overflow-y: auto; /* ✅ Ajoute un scroll si nécessaire */
  }

  /* ✅ Modifier l'affichage des liens */
  .mobile-menu .nav-link {
    display: flex;
    flex-direction: row; /* ✅ Aligner en ligne plutôt qu'en colonne */
    align-items: center;
    justify-content: center;
    color: white;
    font-family: "Poppins", sans-serif;
    font-weight: 700 !important;
    font-size: 16px;
    padding: 12px;
    text-decoration: none;
    transition: all 0.3s ease-in-out;
  }

  .mobile-menu .nav-link i {
    font-size: 20px;
    margin-right: 10px; /* ✅ Ajouter un petit espace entre l'icône et le texte */
  }

  /* ✅ Ajouter un effet de survol */
  .mobile-menu .nav-link:hover {
    background: rgb(241, 105, 15);
    color: black;
  }

  /* ✅ Séparateurs pour une meilleure lisibilité */
  .mobile-menu a:not(:last-child),
  .mobile-menu .nav-link:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
}

@media screen and (max-width: 1024px) {
  .menu-btn {
    position: absolute; /* ✅ S'assurer qu'il reste bien positionné */
    left: 10px; /* ✅ Distance du bord gauche */
    top: 15px; /* ✅ Distance du haut */
    font-size: 32px !important; /* ✅ Taille uniforme */
    color: rgb(255, 255, 255) !important; /* ✅ Couleur */
    background-color: transparent;
    border: none;
    display: flex !important; /* ✅ Toujours affiché */
    align-items: center;
    justify-content: center;
  }

  /* ✅ Supprimer tout padding ou margin parasite */
  .hero-banner {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 80px; /* ✅ Taille adaptée */
    display: flex;
    align-items: center;
    padding-left: 10px; /* ✅ Ajustement */
  }

  /* ✅ Correction pour empêcher tout décalage */
  .hero-content {
    display: flex;
    justify-content: flex-start; /* ✅ Force l'alignement à gauche */
    align-items: center;
    width: 100%;
    max-width: 1200px;
  }
}

/* ✅ Affichage uniquement en mode Desktop */
@media screen and (max-width: 1366px) {  
  .social-buttons {
    display: none !important; /* 🔥 Empêche toute réapparition */
  }
}


/* ✅ Conteneur des boutons sociaux */
.social-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 15px 0;
  margin-top: 10px;
}

/* ✅ Style des icônes */
.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 22px;
  color: white;
  transition: transform 0.3s ease-in-out, background 0.3s ease-in-out;
}

/* ✅ Couleurs spécifiques */
.facebook { background: #3b5998; }
.instagram { background: #e4405f; }
.youtube { background: #ff0000; }
.tiktok { background: #000000; }

/* ✅ Effet hover */
.social-link:hover {
  transform: scale(1.1);
  filter: brightness(1.2);
}


/* ✅ Boutons d'authentification sur desktop */
.desktop-auth-buttons {
  display: flex;
  gap: 15px;
  position: absolute;
  right: 5%;
}

.btn-auth {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.3s ease-in-out;
}

.login-btn {
  background: none;
  border: 2px solid white;
  color: white;
}

.login-btn:hover {
  background: white;
  color: black;
}

.trial-btn {
  background: #f1c40f;
  color: black;
}

.trial-btn:hover {
  background: #ffdd57;
}

/* ✅ Cache complètement la barre du bas sur les écrans larges (>1024px) */
@media screen and (min-width: 1025px) {
  .navbar-container {
    display: none !important;
    visibility: hidden;
    opacity: 0;
    pointer-events: none; /* Désactive toute interaction */
  }
}

/* ✅ S'assure qu'elle s'affiche UNIQUEMENT en mobile */
@media screen and (max-width: 1024px) {
  .navbar-container {
    display: flex !important;
    visibility: visible;
    opacity: 1;
  }
}


@media screen and (min-width: 1024px) {
  .navbar-container {
    display: none !important;
  }
}
@media screen and (min-width: 1024px) {
  .hero-banner .logo {
    display: none !important;
  }
}
@media screen and (min-width: 1024px) {
  .hero-banner .auth-buttons {
    display: none !important;
  }
}


/* ✅ MENU LATÉRAL GAUCHE (STYLE SPOTIFY) */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 250px;
  height: 100vh; /* S'étend sur toute la hauteur */
  background: #121212;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1100;
  overflow-y: auto; /* Active le scroll si besoin */
  transition: transform 0.4s ease-in-out; /* ✅ Animation fluide */
  transform: translateX(0);
  
}
.sidebar::-webkit-scrollbar {
  width: 8px; /* ✅ Taille fine et élégante */
}

.sidebar::-webkit-scrollbar-track {
  background: transparent; /* ✅ Pas de fond visible */
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3); /* ✅ Barre semi-transparente */
  border-radius: 10px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5); /* ✅ Plus visible au survol */
}

/* ✅ Applique à TOUS les scrollbars sur le site */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent; /* ✅ Support Firefox */
}

/* ✅ Style des scrollbars pour Chrome, Edge et Safari */
*::-webkit-scrollbar {
  width: 10px; /* ✅ Taille fine et élégante */
}

/* ✅ Fond du scrollbar */
*::-webkit-scrollbar-track {
  background: #0a0a0a; /* ✅ Fond noir subtil */
  border-radius: 10px;
}

/* ✅ Barre de défilement */
*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255, 0, 0, 0.7), rgba(255, 120, 0, 0.7)); /* ✅ Dégradé rouge/orange */
  border-radius: 10px;
  box-shadow: 0px 0px 10px rgba(255, 69, 0, 0.75); /* ✅ Effet lumineux */
}

/* ✅ Effet au survol */
*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255, 0, 0, 1), rgba(255, 120, 0, 1)); /* ✅ Plus vif */
}

/* ✅ Logo en haut du menu */
.sidebar-logo {
  text-align: center;
  margin-bottom: 20px;
}

.sidebar-main-logo {
  width: 150px;
  height: auto;
  filter: brightness(1.2);
  transition: transform 0.2s ease-in-out;
}

.sidebar-main-logo:hover {
  transform: scale(1.1);
}

/* ✅ Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ✅ Style des liens */
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

.sidebar-link i {
  font-size: 24px;
  font-weight: bold; /* ✅ Rend l'icône plus épaisse */
  transition: transform 0.2s ease-in-out, color 0.3s ease-in-out;
}

.sidebar-link span {
  font-weight: bold; /* ✅ Épaissit aussi le texte des liens */
}


.sidebar-link:hover,
.sidebar-link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.sidebar-link:hover i {
  transform: scale(1.2);
  color:rgb(240, 56, 10); /* Vert Spotify */
}

/* ✅ Déconnexion */
.sidebar-link.logout {
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #ff4d4d;
}

.sidebar-link.logout:hover {
  background: rgba(255, 77, 77, 0.2);
}

/* ✅ Masquer sur mobile */
@media screen and (max-width: 1024px) {
  .sidebar {
    display: none; /* ❌ Cache la sidebar sur iPad */
  }
  
  .menu-btn {
    display: block !important; /* ✅ Assure que le menu hamburger est visible */
  }
  @media screen and (max-width: 1024px) {
  .menu-btn {
    font-size: 32px !important; /* ✅ Même taille pour iPad et iPhone */
    color: rgb(255, 255, 255) !important;  /* ✅ Couleur forcée */
    background-color: transparent;
    border:none;
    display: flex !important; /* ✅ S'assurer qu'il est bien affiché */
    align-items: center;
    justify-content: center;
  }
  
  /* ✅ Corrige les styles spécifiques aux appareils Apple */
  .menu-btn:focus {
    outline: none !important; /* 🔄 Supprime le contour bleu sur iOS */
  }
}
}

@media screen and (min-width: 768px) and (max-width: 1366px) { 
  .navbar-container {
    display: flex !important; /* ✅ Forcer l'affichage du menu */
  }
}

@media screen and (min-width: 768px) and (max-width: 1024px) {
  .mobile-menu {
    position: fixed;
    top: 80px; /* ✅ Descend le menu sous le header */
    left: 0;
    width: 100%;
    height: calc(100% - 80px); /* ✅ Prend tout l’espace sous le header */
    background: #000000;
    opacity: 88%;
    
    flex-direction: column;
    padding: 15px;
    margin-top:3%;
    box-shadow: 4px 0px 10px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease-in-out;
    z-index: 999; /* ✅ Passe bien au-dessus */
    overflow-y: auto; /* ✅ Ajoute un scroll si besoin */
  }
}






.slide-enter-active, .slide-leave-active {
  transition: transform 0.5s ease-in-out;
}

/* Test avec une transition simple */
.slide-enter {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}




/* ✅ CONTAINER PRINCIPAL */
.layout-container {
  display: flex;
  flex-direction: row;
  background-color: #121212;
  height: 100vh;
  width: 100vw;
  overflow: auto; /* ✅ Empêche le scroll horizontal */
}


/* ✅ HEADER AMÉLIORÉ */
.hero-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding-top:20px;
  height: 120px;
  background-color:black;

  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 1050;
  padding: 0 20px;
}

/* ✅ CONTENU DU HEADER */
.hero-content {
  display: flex;
  align-items: center;
  width: 65%;
  max-width: 1200px;
}

/* ✅ LOGO */
.logo {
  height: 0px;
  margin-left:20%;
  width: auto;
}

/* ✅ TEXTE DU HEADER */
.hero-text {
  flex-grow: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
}
.sidebar:not(.isCollapsed) ~ .hero-banner .hero-text {
  margin-left: 125px; /* ✅ Ajuste pour compenser l’espace de la sidebar */
}

/* ✅ Lorsque la sidebar est réduite */
.sidebar.isCollapsed ~ .hero-banner .hero-text {
  margin-left: 35px; /* ✅ Réduit l’espace pour recentrer le texte */
}
/* ✅ TITRE PRINCIPAL (plus grand et plus impactant) */
.hero-title {
  font-family: "Poppins", sans-serif;
  font-size: 2.5rem; /* Augmenté pour plus de présence */
  font-weight: 800; /* Très gras pour un effet percutant */
  color: white;
  text-transform: uppercase;
  letter-spacing: 2px; /* Espacement accentué */
  text-shadow: 0px 3px 15px rgba(255, 255, 255, 0.3); /* Ombre plus visible */
  margin: 0;
  padding: 5px 0;
  margin-top:10px;
}

/* ✅ SOUS-TITRE (plus lisible et aéré) */
.hero-subtitle {
  font-size: 1.2rem; /* Taille augmentée pour meilleure lecture */
  font-weight: 500; /* Un peu plus gras */
  color: #a10000; /* Gris plus clair pour plus de lisibilité */
  text-transform: uppercase;
  letter-spacing: 1,5px;
  text-align: center;
  margin-top: 10px;
  opacity: 0.9; /* Effet plus lisible */
  
}



/* ✅ BOUTONS DU HEADER */
.auth-buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 15px;
}

/* ✅ STYLE BOUTON "PRENDRE UN COURS" */
.btn-cours {
  background-color: #f1c40f;
  color: black !important;
  font-weight: bold;
  padding: 8px 15px;
  border-radius: 8px;
  text-transform: uppercase;
  font-size: 20px;
  transition: background 0.3s ease-in-out;
}

.btn-cours:hover {
  background-color: #ffdd57;
}
.fullwidth {
  max-width: 100vw;
  width: 100%;
  padding: 0;
  margin: 0;
}

/* ✅ STYLE DES AUTRES BOUTONS */
.nav-link {
  display: flex;
  flex-direction: column;
  gap:-2px;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: 12px;
  font-family: "Poppins", sans-serif; 
  font-weight: 700 !important; /* Très gras */


  padding: 15px;
  transition: all 0.3s ease-in-out;
}

.nav-link i {
  font-size: 22px;
    font-family: "Poppins", sans-serif; 
  font-weight: 700 !important; /* Très gras */
  transition: transform 0.2s ease-in-out, color 0.3s ease-in-out, text-shadow 0.3s ease-in-out;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color:rgb(250, 9, 9); /* Vert Spotify */
    font-family: "Poppins", sans-serif; 
  font-weight: 700 !important; /* Très gras */
  text-shadow: 0px 0px 10px rgba(243, 14, 14, 0.8); /* Glow vert subtil */
}
.nav-link.logout {
  background-color: transparent;
  border: none;
  cursor: pointer;
}
.nav-link:hover i,
.nav-link.router-link-exact-active i {
  transform: scale(1.1);
}
.nav-link:active {
  transform: translateY(2px); /* Effet d'enfoncement */
}

.nav-link.logout:hover {
  color: #ff4d4d;
  text-shadow: 0px 0px 10px rgba(255, 77, 77, 0.8);
}

/* ✅ CONTENU PRINCIPAL */
.page-content {
  flex-grow: 1; /* ✅ Prend tout l'espace restant */
  overflow-y: auto; /* ✅ Permet le scroll vertical si nécessaire */
  padding: 20px;
  background-color: rgba(3, 1, 1, 0.801);
  min-height: 100vh;
  transition: margin-left 0.3s ease-in-out;
  /* ✅ Décale le contenu à droite de la largeur de la sidebar */
 
  margin-top:80px;
}
.sidebar:not(.isCollapsed) ~ .page-content {
  margin-left: 250px; /* ✅ Décale le contenu pour laisser de la place à la sidebar */
}
.navbar-nav .nav-link {

   /* ✅ Taille fixe pour éviter les micro-ajustements */

  
}
.navbar-nav .nav-link:active {
  transform: none !important;
}
.navbar-nav .nav-link:hover,
.navbar-nav .nav-link.router-link-exact-active {
  transform: none !important; /* 🔥 Empêche tout redimensionnement */
  text-shadow: none !important; /* 🔥 Évite l'effet de tremblement */
}
@media screen and (min-width: 1024px) {
  .navbar-container {
    height: 80px; /* Ajuste la hauteur pour Desktop */
  }

  .navbar-nav .nav-link {
  
  
  text-transform: uppercase;
  font-family: "Poppins", sans-serif;
}


 
}

@media screen and (min-width: 1024px) {
  .logo {
    height: 100px;
    max-width: 220px;
    transition: transform 0.3s ease-in-out, filter 0.3s ease-in-out;
  }
   



  .logo:hover {
    transform: scale(1.1); /* Zoom léger */
    filter: brightness(1.2); /* Légère mise en valeur */
  }
  .btn-cours {
  background-color: #f1c40f;
  color: black !important;
  font-weight: bold;
  padding: 8px 15px;
  border-radius: 8px;
  text-transform: uppercase;
  font-size: 20px;
  transition: background 0.3s ease-in-out;
}
}


/* ✅ MENU FIXE EN BAS */
.navbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px; /* Légèrement plus haute */
  background: rgba(0, 0, 0, 0.8); /* Semi-transparent */
  backdrop-filter: blur(10px); /* Effet verre dépoli */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  border-top: 1px solid rgba(255, 255, 255, 0.1); /* Légère séparation */
}

.loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 20px;
  border-radius: 5px;
  font-size: 18px;
  font-weight: bold;
}

.loading-container {
  position: fixed;  /* Rend le loader toujours visible */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);  /* Centre parfaitement */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8); /* Fond légèrement opaque pour la visibilité */
  z-index: 1000; /* Assure que le loader passe au-dessus */
}

.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}


.navbar-nav {
 
  
  flex-direction: row;
  

}

.nav-item {
  
  text-align: center;
}

/* ✅ BOUTON INSTALLATION PWA */
  .install-btn {
    position: absolute;
    background:none;
    border:none;
    top: 10px; /* Ajuste la distance du haut */
    right: 15px; /* Distance par rapport au bord droit */
    font-size: 22px; /* Ajuste la taille de l’icône */
    z-index: 1100; /* S'assure qu'elle passe au-dessus des autres éléments */
  }

  .hero-subtitle {
    margin-top: 20px; /* Ajoute de l’espace sous le titre */
  }

.install-btn:hover {
  transform: scale(1.2);
  color: #f1c40f;
}

/* ✅ MENU RESPONSIVE */
/* ✅ Overlay semi-transparent quand le menu est ouvert */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

/* ✅ Menu latéral qui arrive depuis la gauche */
.mobile-menu {
  position: fixed;
  top: 75px; /* Juste sous le header */
  left: -40%; /* Caché en dehors de l'écran */
  width: 38%;
  height: calc(100% - 75px);
  background: #000000;
  display: flex;
  opacity: 88%;
  text-align: center;
  flex-direction: column;
  padding: 15px;
  box-shadow: 4px 0px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out; /* ✅ Animation fluide */
  z-index: 999;
}
.mobile-menu a:not(:last-child),
.mobile-menu .nav-link:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.3); /* Ligne séparatrice */
  padding-bottom: 8px; /* Espacement */
  margin-bottom: 8px;
}

/* ✅ Quand le menu est actif, il glisse à gauche */
.mobile-menu.active {
  text-align: center;
  transform: translateX(100%); /* ✅ Slide depuis la gauche */
}


/* ✅ Style des liens dans le menu */
.mobile-menu .nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
    font-family: "Poppins", sans-serif; 
  font-weight: 700 !important; /* Très gras */
  font-size: 15px;
  text-decoration: none;
  transition: all 0.3s ease-in-out;
  padding: 5px;
}

.mobile-menu .nav-link i {
  font-size: 13x; /* ✅ Taille des icônes */
    font-family: "Poppins", sans-serif; 
  font-weight: 700 !important; /* Très gras */
  margin-right: 0px; /* ✅ Ajout d'espace entre l'icône et le texte */
}

.mobile-menu .nav-link:hover {
  background:rgb(241, 105, 15);
  color: black;
}

.fullscreen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.fullscreen .page-content {
  flex-grow: 1;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
}

.fullscreen header,
.fullscreen footer {
  display: none;
}

@media screen and (max-width: 768px) {
.hero-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px; /* Réduction de la hauteur pour un look plus compact */
  background: #181818; /* Fond noir uni, plus propre */
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); /* Ombre subtile */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 0 20px;
}

 .hero-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 90%;
  max-width: 1200px;
}
.hero-text {
  flex-grow: 1;
  text-align: center;
}
.hero-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: white;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.hero-subtitle {
  font-size: 0.9rem;
  color: #ca0000;
  text-transform: uppercase;
}

  
  .logo {
    margin-left:0%;
  }


/* ✅ Bouton du menu hamburger */
.menu-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: white;
  transition: transform 0.2s ease-in-out;
}

/* ✅ Animation du menu hamburger */
.menu-btn:hover {
  transform: scale(1.1);
  color:rgb(185, 73, 29); /* Vert Spotify */
}

.hero-text {
  flex-grow: 1;  
  display: flex;
  flex-direction: column;
  align-items: center; /* ✅ Centre horizontalement */
  justify-content: center; /* ✅ Centre verticalement */
  text-align: center; /* ✅ Texte centré */
  width: 100%; /* ✅ Assure que ça prend tout l’espace */
  margin: 0 auto; /* ✅ Centrage parfait */
  margin-left:0;
}
.hero-subtitle {
  font-size: 0.85rem;
  color: #cc4100;
  text-transform: uppercase;
  margin-top: 4px;
  position: relative;
  overflow: hidden;
  display: inline-block;
}

.hero-subtitle::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  filter: blur(5px); /* Ajoute un flou doux */
  opacity: 0.8; /* Rend l'effet plus subtil */
  animation: shine 3s infinite linear;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}


.btn-cours {
  font-size: 10px !important;
  display: none !important;
  }






  /* ✅ Adapter "Mon Espace" en icône */
  .auth-buttons .mon-espace {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    color: white !important;
    padding: 10px;
    border-radius: 50%;
    font-size: px;
    width: 40px;
    height: 40px;
  }

  /* ✅ Cacher le texte et garder uniquement l’icône */
  .auth-buttons .mon-espace span {
    display: none !important;
  }

  /* ✅ Agrandir l’icône */
  .auth-buttons .mon-espace i {
    font-size: 24px !important;
    display: none !important;
  }

  /* ✅ Correction : FORCER LE MENU BAS À RESTER VISIBLE */
.navbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  background: linear-gradient(to top, #101010, #181818); /* Dégradé subtil */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.4); /* Ombre adoucie */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;

}




  .navbar-nav {
    display: flex !important;
    justify-content: space-around;
    font-size:17px;
    align-items: center;
    width: 100%;
  }
}
@media screen and (max-width: 1024px) {
  .page-content {
    margin-left: 0; /* ✅ Plus de sidebar en mobile, donc pas de décalage */
  }
  .navbar-container {
    height: 70px; /* Augmenté pour plus de confort */
  }

  /* ✅ Taille des icônes et du texte */
  .navbar-nav .nav-link {
    font-size: 11px; /* 🔺 Augmente la taille du texte */
    font-weight: 500; /* 🔺 Texte plus épais */
    text-transform: uppercase;
    font-family: "Poppins", sans-serif;
    margin-top:-10px;
  }

  .navbar-nav .nav-link i {
    font-size: 30px; /* 🔺 Icônes plus grandes */
    margin-bottom: -10px; /* 🔺 Ajoute un peu d’espace */
  }

  /* ✅ Ajustement du padding pour améliorer l'accessibilité */
  .navbar-nav .nav-link {
    padding: 15px 10px; /* 🔺 Augmente la zone cliquable */
  }

 

}


</style>