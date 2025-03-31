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
import GlobalMetronome from '@/components/GlobalMetronome.vue';
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

// Watcher sur isRefreshingToken pour gérer l'affichage du spinner
watch(isRefreshingToken, (newVal) => {
  if (newVal) {
    showOverlay.value = true;
  } else {
    setTimeout(() => {
      showOverlay.value = false;
    }, 500);
  }
});

// Fonction de vérification de l'expiration du JWT
function isTokenExpired(token) {
  if (!token) return true;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const exp = payload.exp * 1000;
  return Date.now() > exp;
}

// Lors du montage de la page, vérifier le JWT et le rafraîchir si nécessaire
onMounted(async () => {
  // Enregistrer le service worker
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

  // Commencer immédiatement à afficher la citation
  showIntro();

  // Vérifier si le JWT est expiré et rafraîchir pendant l'affichage de la citation
  if (isTokenExpired(jwtToken.value)) {
    console.log("JWT expiré, rafraîchissement nécessaire");
    await authStore.refreshToken(); // Rafraîchissement du token
  }
});

// Affichage de la citation pendant le rafraîchissement du token
function showIntro() {
  const quoteEl = document.getElementById("music-quote");
  const goButton = document.getElementById("go-button");

  if (quoteEl) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    typeWriter(quotes[randomIndex], quoteEl, 55, () => {
      goButton.classList.remove("hidden");
      goButton.classList.add("show", "fade-in");
    });
  }
}

// Fonction de typewriter pour l'animation de texte
function typeWriter(text, element, speed = 55, onComplete = null) {
  let i = 0;
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (onComplete) {
      setTimeout(() => {
        if (element.classList.contains('quote')) {
          element.classList.add("fade-out");
        }
        onComplete();
      }, 2000);
    }
  }
  type();
}

const quotes = [
  "🎶 \"La basse ancre le rythme et redéfinit les harmonies.\" – James Jamerson",
  "🎸 \"Il y a tellement plus que de jouer les notes. Quand vous jouez, vous jouez la vie.\" – Jaco Pastorius",
  "🔊 \"La basse, c'est l'endroit où le funk réside.\" – Bootsy Collins",
  // Autres citations...
];
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
