<template>
  <div class="intro-container">
    <!-- Logo en haut de la page -->
    <div class="logo-container">

      <img :src="logoUrl" alt="Logo SunBassSchool" class="sidebar-main-logo">
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

    <!-- Fenêtre d'intro -->
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

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { preventIndexedDBCleanup, checkIndexedDBStatus } from "@/utils/api";
import { getCache } from "@/utils/cacheManager";

const router = useRouter();
const showModal = ref(false);
const offlineMode = ref(false);
const baseUrl = import.meta.env.VITE_BASE_URL || "/app/";
const logoUrl = ref(`${baseUrl}images/logo.png`);

onMounted(async () => {
  console.log("🚀 Début de l'initialisation de IntroView...");

  // 🛡️ Maintenance session côté IndexedDB
  preventIndexedDBCleanup();
  checkIndexedDBStatus();

  // 📴 Mode hors ligne + données en cache ?
  if (!navigator.onLine && getCache("userData_sunny")) {
    console.warn("⚠️ Mode hors ligne activé, utilisation du cache...");
    offlineMode.value = true;
    return;
  }

  // ✅ Sinon on affiche la modale
  showModal.value = true;
});

// 🎬 Action au clic sur "Commencer"
const goToDashboard = () => {
  console.log("🎬 Bouton Commencer cliqué !");
  sessionStorage.setItem("comingFromIntro", "true");
  router.replace("/dashboard");
};
</script>

<style scoped>
.intro-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom left, rgb(17, 9, 9), rgb(0, 0, 0));
}
.logo-container {
  margin-bottom: 40px;
}
.logo {
  margin-top: 200px;
  width: 100px;
  height: auto;
}
.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}
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
.intro-box {
  width: 450px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
}
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
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s ease-in-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
