<template>
  <!-- Écran de chargement -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- Interface principale -->
  <div v-else>
    <router-view v-if="router.isReady()" :key="authStore.forceRefresh" />
    <!-- ✅ Ajout de :key="authStore.forceRefresh" pour forcer le re-render -->
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import router from "@/router";

const isLoading = ref(true);
const authStore = useAuthStore();

// ✅ Surveille les changements de `forceRefresh` et cache le chargement
watch(() => authStore.forceRefresh, () => {
  console.log("🔄 Refresh détecté, re-render en cours...");
  isLoading.value = false;
});

// ✅ Gérer l'initialisation et l'affichage
onMounted(async () => {
  console.log("🔄 Restauration des tokens en cours...");

  try {
    await authStore.loadUser();

    // ✅ Vérifier si le router est prêt avant de supprimer le loader
    await router.isReady();

    nextTick(() => {
      console.log("🔄 UI rechargée après refresh");
      isLoading.value = false;
    });
  } catch (error) {
    console.error("❌ Erreur pendant la restauration des tokens :", error);
    isLoading.value = false;
  }
});
</script>



<style>
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

/* ⚠️ Message si timeout */
.timeout-message {
  color: #7a7a7a;
  font-size: 1rem;
  margin-top: 15px;
  text-align: center;
}
.timeout-message a {
  color: #ff7300;
  text-decoration: none;
  font-weight: bold;
}

/* 🎡 Animation du spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 🌆 Animation d’apparition */
.app-container {
  opacity: 0;
  animation: fadeIn 0.5s ease-in-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
