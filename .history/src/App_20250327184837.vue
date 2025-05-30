<template>
  <div class="app-container">
    {{ isRefreshingToken ? '🔄 OUI REFRESH' : '⛔️ PAS DE REFRESH' }}
    <transition name="fade">
  <div class="refresh-overlay" v-if="showOverlay">
    <div class="spinner-container">
      <i class="fas fa-sync fa-spin"></i>
      <p>Rafraîchissement de la session...</p>
    </div>
  </div>
</transition>

    <SwUpdateToast ref="swToastRef" />

    <MetronomeProvider>
      
        <router-view />
      
    </MetronomeProvider>
  </div>
</template>


<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import MetronomeProvider from '@/components/MetronomeProvider.vue';

import { useAuthStore } from "@/stores/authStore";
import RefreshOverlay from "@/components/RefreshOverlay.vue";
import SwUpdateToast from "@/components/SwUpdateToast.vue";
import { registerSW } from 'virtual:pwa-register';
import { storeToRefs } from 'pinia';
const authStore = useAuthStore();
const { isRefreshingToken } = storeToRefs(authStore); // 👈 voilà
const localRefreshing = ref(false);
const swToastRef = ref();
const route = useRoute();
const showOverlay = ref(false);
const delayTimeout = ref(null);
watch(isRefreshingToken, (newVal) => {
  if (newVal) {
    showOverlay.value = true;
    console.log("🌀 Overlay visible");
  } else {
    // On garde un délai pour être sûr que le composant ait le temps d'apparaître
    delayTimeout.value && clearTimeout(delayTimeout.value);
    delayTimeout.value = setTimeout(() => {
      showOverlay.value = false;
      console.log("✅ Overlay caché");
    }, 500); // délai de 500ms pour la transition
  }
});


// Gère l'affichage de l'overlay uniquement la première fois qu'il est montré
const onRefreshOverlayShown = () => {
  refreshOverlayShown.value = true;
};

// Debug des changements de route
watch(() => route.path, (newPath) => {
  console.log("📍 Navigation vers:", newPath);
});

// Gestion PWA
onMounted(() => {
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
});
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
  background-color: rgba(255, 0, 0, 0.7); /* 🔥 Rouge semi-transparent pour test */
}
</style>
