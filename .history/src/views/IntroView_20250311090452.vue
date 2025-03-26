<template>
  <div class="intro-container">
    <!-- Logo en haut de la page -->
    <div v-if="!showModal" class="logo-container">
      <img :src="logoUrl" alt="SunBassSchool Logo" class="logo" />
    </div>

    <!-- Spinner de chargement -->
    <div v-if="!showModal && !offlineMode" class="d-flex justify-content-center align-items-center" style="height: calc(100vh - 120px);">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
    </div>

    <!-- Mode hors ligne détecté -->
    <div v-if="offlineMode" class="offline-box">
      <p>⚠️ Mode hors ligne détecté. Chargement des données depuis le cache...</p>
      <button class="btn btn-secondary" @click="goToDashboard">Continuer</button>
    </div>

    <!-- Fenêtre d'intro (visible après l'animation de chargement) -->
    <transition name="fade" appear>
      <div v-if="showModal" class="intro-box text-center p-4">
        <h1 class="title mb-3">Bienvenue sur <span class="highlight">SunBassSchool</span></h1>
        <p class="subtitle mb-4">Prépare-toi à plonger dans l'univers de la basse 🎸</p>
        <button class="btn btn-primary btn-lg start-button" @click="goToDashboard">
          <i class="bi bi-play-circle-fill me-2"></i>Commencer
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { refreshToken, getToken, getRefreshTokenFromDB, isJwtExpired, verifyIndexedDBSetup } from "@/utils/api";
import { getCache } from "@/utils/cacheManager"; // 📌 Vérifier les données locales

const showModal = ref(false);
const offlineMode = ref(false);
const router = useRouter();
const logoUrl = `${import.meta.env.BASE_URL}images/logo.png`;

onMounted(async () => {
  console.log("🚀 Début de l'initialisation de IntroView...");

  try {
    // Vérification du token JWT
    console.log("🔍 Vérification du JWT en cours...");
    let jwt = await getToken();
    
    // Mode hors ligne - Vérification du cache
    const cachedUserData = getCache("userData_sunny");
    if (!navigator.onLine && cachedUserData) {
      console.warn("⚠️ Mode hors ligne détecté, chargement des données depuis le cache...");
      offlineMode.value = true;
      return;
    }

    // Si le JWT est valide, on redirige vers l'espace utilisateur
    if (jwt && !isJwtExpired(jwt)) {
      console.log("✅ JWT valide trouvé, connexion...");
      sessionStorage.setItem("jwt", jwt);
      return router.push("/mon-espace");
    }

    // Tentative de récupération du refresh token
    console.warn("⚠️ JWT absent ou expiré, tentative de refresh...");
    const refreshTokenAvailable = await withTimeout(getRefreshTokenFromDB(), 3000);
    console.log("🔍 Refresh token récupéré depuis IndexedDB :", refreshTokenAvailable);

    if (!refreshTokenAvailable) {
      console.warn("❌ Aucun refresh token disponible, affichage du bouton Commencer.");
      showModal.value = true;
      return;
    }

    // 🔄 Tentative de refresh du JWT
    console.log("🔄 Tentative de refresh du JWT...");
    const newJwt = await withTimeout(refreshToken(), 3000);
    if (newJwt) {
      console.log("✅ Nouveau JWT récupéré, redirection...");
      sessionStorage.setItem("jwt", newJwt);
      return router.push("/mon-espace");
    }

    console.warn("⚠️ Refresh échoué, affichage du bouton Commencer.");
    showModal.value = true;

  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation :", error);
    showModal.value = true;
  }

  setTimeout(() => {
    console.log("✅ Fin de l'initialisation de IntroView.");
  }, 1000);
});



// ✅ Timeout pour éviter les blocages liés à IndexedDB
async function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject("⏳ Timeout"), ms));
  return Promise.race([promise, timeout]).catch((error) => {
    console.warn("⚠️ Erreur / Timeout :", error);
    return null;
  });
}

// ✅ Redirection manuelle vers le dashboard
const goToDashboard = () => {
  console.log("🎬 Bouton Commencer cliqué !");
  sessionStorage.setItem("comingFromIntro", "true");  // ✅ Stocke l'info
  router.replace("/login");


};

</script>

<style scoped>
/* ✅ Fond et affichage plein écran */
.intro-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom left, rgb(17, 9, 9), rgb(0, 0, 0));
}

/* ✅ Conteneur du logo */
.logo-container {
  margin-bottom: 40px;
}

/* ✅ Style du logo */
.logo {
  margin-top: 200px;
  width: 100px;
  height: auto;
}

/* ✅ Spinner de chargement */
.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}

/* ✅ Mode hors ligne */
.offline-box {
  text-align: center;
  color: white;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
}

.offline-box p {
  margin-bottom: 10px;
}

/* ✅ Fenêtre d'intro */
.intro-box {
  width: 450px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
}

/* ✅ Style du texte */
.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
}

.highlight {
  color: rgb(250, 96, 96);
}

.subtitle {
  font-size: 1.2rem;
  color: #d1d5db;
  margin-top: 10px;
}

/* ✅ Bouton "Commencer" */
.start-button {
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  background: rgb(250, 96, 96);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.start-button:hover {
  background: rgb(207, 0, 0);
}

/* ✅ Animation */
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s ease-in-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
