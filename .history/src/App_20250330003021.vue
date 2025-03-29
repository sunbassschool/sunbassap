<template>
  <div class="app-container">
    {{ isRefreshingToken ? '🔄 OUI REFRESH' : '⛔️ PAS DE REFRESH' }}

    <transition name="fade">
      <div v-if="isRefreshingToken" class="refresh-overlay">
        <div class="spinner-container">
          <i class="fas fa-sync fa-spin"></i>
          <p>Rafraîchissement de la session...</p>
        </div>
      </div>
    </transition>

    <SwUpdateToast ref="swToastRef" />

    <MetronomeProvider>
      <router-view />
      <GlobalMetronome v-show="false" />
    </MetronomeProvider>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import MetronomeProvider from '@/components/MetronomeProvider.vue';
import GlobalMetronome from '@/components/GlobalMetronome.vue'; // 👈 AJOUT ICI

import { useAuthStore } from "@/stores/authStore";
import SwUpdateToast from "@/components/SwUpdateToast.vue";
import { registerSW } from 'virtual:pwa-register';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { isRefreshingToken, jwtToken } = storeToRefs(authStore); // Accède au JWT dans le store
const swToastRef = ref();
const route = useRoute();
const showOverlay = ref(false);
const delayTimeout = ref(null);

// Watch sur isRefreshingToken pour gérer l'affichage du spinner
watch(isRefreshingToken, (newVal) => {
  if (newVal) {
    showOverlay.value = true;
    console.log("🌀 Overlay visible");
  } else {
    delayTimeout.value && clearTimeout(delayTimeout.value);
    delayTimeout.value = setTimeout(() => {
      showOverlay.value = false;
      console.log("✅ Overlay caché");
    }, 500);
  }
});

// Vérifier l'expiration du JWT et rafraîchir si nécessaire
function isTokenExpired(token) {
  if (!token) return true; // Si pas de token, on le considère comme expiré
  const payload = JSON.parse(atob(token.split('.')[1])); // Décoder le payload
  const exp = payload.exp * 1000; // Convertir en millisecondes
  return Date.now() > exp; // Retourne vrai si le token est expiré
}

onMounted(() => {
  // Enregistrer le service worker (pour gestion hors ligne, mises à jour, etc.)
  registerSW({
    onNeedRefresh() {
      swToastRef.value?.show();
    },
    onOfflineReady() {
      console.log('✅ Application prête pour le mode hors ligne');
    },
    onError(error) {
      console.error("❌ Erreur lors de l'enregistrement du service worker:", error);
    }
  });

  // Vérifier si le JWT est expiré dès le montage de l'app
  if (isTokenExpired(jwtToken.value)) {
    console.log("JWT expiré, rafraîchissement nécessaire");
    authStore.refreshToken(); // Rafraîchir le token si expiré
  } else {
    // Si le token est valide, démarrer l'application sans rafraîchissement
    initializeApp();
  }
});

// Fonction pour initialiser l'app une fois le rafraîchissement terminé
function initializeApp() {
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen?.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen?.remove();
    console.log("✅ Application démarrée");
    localStorage.setItem("sunbass-welcome-lastShown", Date.now().toString());
  }, 600);
}
</script>


<style scoped>
/* 🌑 UI sombre */
body {
  background: #121212;
  color: #fff;
  font-family: "Arial", sans-serif;
  margin: 0;
  padding: 0;
}

/* 🔄 Écran de chargement */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #000000;
  z-index: 9999;
}

/* 🔥 Effet néon sur le texte */
.loading-text {
  font-size: 0.8rem;
  color: #ff0800ee;
  margin-top: 10px;
}

/* ⏳ Loader circulaire */
.loader {
  width: 20px;
  height: 20px;
  border: 5px solid rgb(54, 54, 54);
  border-top: 5px solid #790404;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 🎡 Animation du spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 🌆 Animation d'apparition */
.app-container {
  opacity: 0;
  animation: fadeIn 0.5s ease-in-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Styles pour l'overlay de rafraîchissement */
.refresh-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 0, 0, 0.7); /* Pour test */
  z-index: 99999;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner-container {
  color: white;
  font-size: 1.5rem;
  text-align: center;
}
</style>
