<template>
  <div class="layout-container">
<!-- ✅ Menu latéral gauche (style Spotify) -->
<aside class="sidebar" v-if="!isMobile">
  <div class="sidebar-logo">
    <img src="/images/logo.png" alt="Logo SunBassSchool" class="sidebar-main-logo">
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

    <button v-if="isLoggedIn" @click="logout" class="sidebar-link logout">
      <i class="bi bi-box-arrow-right"></i>
      <span>Déconnexion</span>
    </button>
  </nav>
</aside>



    <!-- ✅ Bandeau principal -->
    <header class="hero-banner">
      <div class="hero-content">
        <!-- ✅ Logo pour Desktop -->
        <img v-if="!isMobile" src="/images/logo.png" alt="Logo SunBassSchool" class="logo" />

        <!-- ✅ Logo Responsive si l'utilisateur n'est pas connecté -->
        <img v-if="showResponsiveLogo" src="/images/logo.png" alt="Logo SunBassSchool" class="logo responsive-logo" />

        <!-- ✅ Menu Hamburger en Responsive -->
        <button class="menu-btn" v-if="isMobile&isLoggedIn" @click="toggleMenu">
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


</div> <!-- Fin de .hero-content -->

        <!-- ✅ Boutons uniquement si connecté -->
        <div v-if="isLoggedIn" class="auth-buttons">
        <a class="sidebar-link btn-cours" 
   href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/" 
   target="_blank" 
   rel="noopener noreferrer">
  <i class="bi bi-play-circle"></i>
  <span>Prendre un cours</span>
</a>


          <router-link to="/mon-espace" class="nav-link mon-espace">
            <i class="bi bi-person-circle"></i>
            <span>Mon Espace</span>
          </router-link>

         

        </div>
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
    <slot></slot>
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
import { nextTick } from "vue";
import { onMounted, ref } from "vue";
import { apiFetch } from "@/services/apiService";
const user = ref(null);
const isLoggedIn = ref(false);
export default {
  name: "Layout",
  data() {
    return {
      jwt: sessionStorage.getItem("jwt") || localStorage.getItem("jwt") || "",
      refreshjwt: localStorage.getItem("refreshjwt") || "",
      showMenu: false,
      isRefreshing: false,
      isMobile: window.innerWidth < 768,
      isLoading: false,
      showInstallButton: false,
          refreshFailed: false,
      deferredPrompt: null,
      tokenCheckInterval: null,
      apiBaseURL:
        "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbyaXWbAryyHp1t7HmdCHN7EuQwVlwol5u3WTtULrtN6yY9JFxjikiExxvQrakD56QRHyw/exec",
      fullScreenPages: ["/register-cursus"],
    };
  },
 
computed: {
  isAdmin() {
    if (!this.jwt) return false;
    try {
      const decoded = jwtDecode(this.jwt);
      return decoded.role === "admin";
    } catch {
      return false;
    }
  },



    isLoggedIn() {
      return !!this.jwt;
    },
    prenom() {
      return sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
    },
    isPremium() {
      return sessionStorage.getItem("abo") === "premium";
    },
    email() {
      return sessionStorage.getItem("email") || localStorage.getItem("email") || "";
    },
   
    isEleve() {
      return sessionStorage.getItem("role") === "eleve";
    },
    showResponsiveLogo() {
      return !this.isLoggedIn && this.isMobile;
    },
    isFullScreenPage() {
      return !this.isMobile && this.fullScreenPages.includes(this.$route.path);
    },
  },
  watch: {
    isMobile(newVal) {
      console.log("🔄 isMobile détecté :", newVal);
    },
  },
  async mounted() {
    this.checkMobile();
    window.addEventListener("resize", this.checkMobile);
    console.log("✅ Vérification de la session existante...");
    
    this.refreshjwt = await this.fetchRefreshToken();

    setTimeout(() => {
      this.checkExistingSession();
    }, 500);

    this.tokenCheckInterval = setInterval(this.checkTokenExpiration, 60000);

    window.addEventListener("resize", this.checkMobile);
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallButton = true;
    });
  },
  beforeUnmount() {
    clearInterval(this.tokenCheckInterval);
    window.removeEventListener("resize", this.checkMobile);
  },
  methods: {
    async openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("auth-db", 1);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("tokens")) {
            db.createObjectStore("tokens");
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("❌ Impossible d'accéder à IndexedDB");
      });
    },



installPWA() {
  if (this.deferredPrompt) {
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("✅ L'utilisateur a installé l'application.");
      } else {
        console.log("❌ L'utilisateur a refusé d'installer l'application.");
      }
      this.deferredPrompt = null; // Réinitialise après utilisation
    });
  } else {
    console.warn("🚨 L'événement beforeinstallprompt n'a pas été déclenché.");
  }
},


    checkMobile() {
      this.isMobile = window.innerWidth < 768;
    },

    decodeJWT(jwt) {
      try {
        const decoded = jwtDecode(jwt);
        sessionStorage.setItem("prenom", decoded.prenom || "");
        sessionStorage.setItem("email", decoded.email || "");
        localStorage.setItem("prenom", decoded.prenom || "");
        localStorage.setItem("email", decoded.email || "");
        return decoded;
      } catch (error) {
        console.error("🚨 Erreur lors du décodage du JWT :", error);
        return null;
      }
    },

    toggleMenu() {
      this.showMenu = !this.showMenu;
    },

    async fetchRefreshToken() {
      try {
        const db = await this.openDatabase();
        const transaction = db.transaction("tokens", "readonly");
        const store = transaction.objectStore("tokens");
        const request = store.get("refreshToken");

        return new Promise((resolve) => {
          request.onsuccess = () => {
            this.refreshjwt = request.result || localStorage.getItem("refreshjwt") || "";
            resolve(this.refreshjwt);
          };
          request.onerror = () => {
            this.refreshjwt = localStorage.getItem("refreshjwt") || "";
            resolve(this.refreshjwt);
          };
        });
      } catch (error) {
        this.refreshjwt = localStorage.getItem("refreshjwt") || "";
        return this.refreshjwt;
      }
    },

    async storeRefreshToken(token) {
      try {
        const db = await this.openDatabase();
        const transaction = db.transaction("tokens", "readwrite");
        const store = transaction.objectStore("tokens");
        store.put(token, "refreshToken");
      } catch (error) {
        console.warn("⚠️ Impossible de stocker le refresh token dans IndexedDB.");
      }
    },

    async removeRefreshToken() {
      localStorage.removeItem("refreshjwt");
      try {
        const db = await this.openDatabase();
        const transaction = db.transaction("tokens", "readwrite");
        const store = transaction.objectStore("tokens");
        store.delete("refreshToken");
      } catch (error) {
        console.warn("⚠️ Impossible de supprimer le refresh token d'IndexedDB.");
      }
    },

async refreshToken() {
    if (this.totalRefreshAttempts >= 10) {
    this.refreshFailed = true;
    console.error("🚨 Trop de tentatives de refresh échouées.");
    return false;
  }
  if (!this.refreshjwt) {
    this.refreshjwt = await this.fetchRefreshToken();
  }

  if (!this.refreshjwt) {
    console.error("🚨 Aucun refresh token disponible.");
    return false; // 🔄 Retourne false au lieu de forcer immédiatement le logout
  }

  // ⏳ Ajout d'une limite stricte pour éviter une boucle infinie
  this.totalRefreshAttempts = this.totalRefreshAttempts || 0;

  if (this.totalRefreshAttempts >= 10) {
    console.error("❌ Trop de tentatives de refresh échouées. Arrêt des tentatives.");
    return false;
  }

  this.attemptCount = this.attemptCount || 0;

  if (this.attemptCount >= 3) {
    console.error("❌ 3 tentatives de refresh échouées. Déconnexion imminente.");
    return false;
  }

  try {
    console.log(`🔄 Tentative de refresh (${this.attemptCount + 1}/3)...`);
    const response = await fetch(`${this.apiBaseURL}?route=refresh&refreshToken=${encodeURIComponent(this.refreshjwt)}`);

    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

    const data = await response.json();

    if (data.status === "success" && data.data.jwt) {
      this.storeSession(data.data);
      console.log("✅ JWT rafraîchi !");
      this.attemptCount = 0;
      this.totalRefreshAttempts = 0; // ✅ Réinitialisation si un refresh réussit
      return true;
    } else {
      throw new Error("Réponse API invalide.");
    }
  } catch (error) {
    console.warn("⚠️ Échec du rafraîchissement :", error);
    this.attemptCount++; 
    this.totalRefreshAttempts++; // 🔄 Incrémente le total des tentatives successives

    if (this.totalRefreshAttempts < 10) {
      setTimeout(() => this.refreshToken(), 5000); // 🔄 Réessaie après 5 secondes
    } else {
      console.error("🚨 Arrêt définitif des tentatives de refresh après 10 échecs.");
    }

    return false;
  }
}


,

    storeSession(data) {
      sessionStorage.setItem("jwt", data.jwt);
      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("refreshjwt", data.refreshToken);
      this.jwt = data.jwt;
      this.refreshjwt = data.refreshToken;
      this.storeRefreshToken(data.refreshToken);
    },

    async checkExistingSession() {
      let jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");

      if (!jwt) {
        this.refreshjwt = await this.fetchRefreshToken();

        if (!this.refreshjwt) {
          return;
        }

        await this.refreshToken();
        return;
      }

      const decoded = this.decodeJWT(jwt);

      if (!decoded || decoded.exp * 1000 < Date.now()) {
        await this.refreshToken();
      } else {
        this.jwt = jwt;
        await nextTick(() => {
          this.isMobile = window.innerWidth < 768;
        });
      }
    },

async checkTokenExpiration() {
  if (!this.jwt) return;

  try {
    const decoded = jwtDecode(this.jwt);
    const expirationTime = decoded.exp * 1000;
    const timeLeft = expirationTime - Date.now();

    console.log(`⏳ JWT expire dans ${Math.round(timeLeft / 1000)}s`);

    if (timeLeft < 120000) { // 🔥 JWT expire dans moins de 2 minutes
      console.warn("⚠️ JWT proche de l'expiration, tentative de refresh...");
      
      if (this.isRefreshing) {
        console.log("🔄 Un refresh est déjà en cours, attente...");
        return;
      }

      this.isRefreshing = true;
      const refreshed = await this.refreshToken();

      if (refreshed) {
        console.log("✅ JWT rafraîchi !");
        
        // ✅ Annule tout éventuel timer de logout s'il était programmé
        if (this.logoutTimer) {
          clearTimeout(this.logoutTimer);
          this.logoutTimer = null;
          console.log("🛑 Timer de logout annulé après un refresh réussi.");
        }
      } else {
        console.warn("❌ Refresh échoué après plusieurs tentatives.");
        // ✅ Ne force pas le logout immédiatement, mais programme un timer de 5 min
        if (!this.logoutTimer) {
          this.logoutTimer = setTimeout(() => {
            console.warn("🚨 Refresh toujours impossible après 5 minutes, déconnexion forcée.");
            this.logout();
          }, 300000);
        }
      }

      this.isRefreshing = false;
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du JWT :", error);
  }
}

,

async logout() {
  console.log("🚨 Déconnexion en cours...");

  sessionStorage.clear();
  localStorage.removeItem("jwt");
  this.jwt = "";
  this.refreshjwt = "";

  if (this.isRefreshing) {
    console.warn("⏳ Un refresh est en cours, tentative de déconnexion différée...");
    setTimeout(() => this.logout(), 5000);
    return;
  }

  console.log("🗑️ Suppression immédiate des données...");

  try {
    await Promise.all([
      this.removeRefreshToken(),
      this.clearIndexedDB(),
      this.unregisterServiceWorkers()
    ]);

    console.log("✅ Déconnexion terminée. Redirection...");
    window.location.href = "/home";
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
  }
},

async clearIndexedDB() {
  if (!indexedDB.databases) return;

  try {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(db => indexedDB.deleteDatabase(db.name))
    );
    console.log("✅ IndexedDB vidé !");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression d'IndexedDB :", error);
  }
},

async unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    console.log("✅ Service Workers désinscrits !");
  } catch (error) {
    console.error("❌ Erreur lors de la désinscription des Service Workers :", error);
  }}
}
  };
</script>







<style scoped>
/* ✅ Affichage uniquement en mode Desktop */
@media screen and (max-width: 1024px) {
  .social-buttons {
    display: none !important;
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
  height: 100vh;
  background: #121212; /* Noir profond */
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1100;
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
    display: none;
  }
}







@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');

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
  flex-direction: column;
    background-color:rgb(255, 255, 255); /* Gris foncé */

  height: 100vh;
  max-width: 100vw;
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
  height: 80px;
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
  color: #ccc; /* Gris plus clair pour plus de lisibilité */
  text-transform: uppercase;
  letter-spacing: 1.5px;
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
  flex-grow: 1;
  overflow-y: auto;
  padding-top: 100px;
  padding-bottom: 70px;
  background-color:rgb(39, 39, 39); /* Gris foncé */
  width: 100vw;
  max-width: 100%;
  min-height: 100vh;
}
@media screen and (min-width: 1024px) {
  .navbar-container {
    height: 80px; /* Ajuste la hauteur pour Desktop */
  }

  .navbar-nav .nav-link {
  font-size: 18px;
  font-weight: 700; /* Essayez 600 si 700 ne fonctionne pas */
  text-transform: uppercase;
  font-family: "Poppins", sans-serif;
}


  .navbar-nav .nav-link i {
    font-size: 30px; /* Agrandit les icônes */
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
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.nav-item {
  flex: 1;
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
  color: #b3b3b3;
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
    flex-grow: 1; /* ✅ Prend l’espace restant */
    
    text-align: center; /* ✅ Centre le texte */
    white-space: ; /* ✅ Empêche la casse */
    overflow: hidden;
    text-overflow: ellipsis;
    position: absolute;
    left: 60%;
    transform: translateX(-50%); /* ✅ Centre exactement le texte */
  }
  .hero-subtitle {
  font-size: 0.8rem;
  color: #ddd;
  margin-left: 3%;
  text-transform: uppercase;
  margin-top: 5px;
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
  height: 55px;
  background: linear-gradient(to top, #101010, #181818); /* Dégradé subtil */
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.4); /* Ombre adoucie */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  transition: all 0.3s ease-in-out;
}




  .navbar-nav {
    display: flex !important;
    justify-content: space-around;
    font-size:17px;
    align-items: center;
    width: 100%;
  }
}

</style>