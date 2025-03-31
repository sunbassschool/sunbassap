<template>
  <div class="app-container">
    {{ isRefreshingToken ? '🔄 OUI REFRESH' : '⛔️ PAS DE REFRESH' }}

  

    <SwUpdateToast ref="swToastRef" />

    <MetronomeProvider>
      <router-view />
      <GlobalMetronome v-show="false" />
      <!-- 👈 AJOUT ICI -->
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
const { isRefreshingToken } = storeToRefs(authStore);
const swToastRef = ref();
const route = useRoute();
const showOverlay = ref(false);
const delayTimeout = ref(null);

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

watch(() => route.path, (newPath) => {
  console.log("📍 Navigation vers:", newPath);
});

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
