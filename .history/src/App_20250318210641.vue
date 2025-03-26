<template>
  <!-- Écran de chargement avant la récupération du JWT -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- Interface principale -->
  <div v-else class="app-container">
    <router-view v-if="isAuthReady" /> <!-- ✅ S'assure que l'auth est prête avant d'afficher le router -->
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { getValidToken } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const isAuthReady = ref(false);
const authStore = useAuthStore();

onMounted(async () => {
  console.log("🔄 Vérification de l'authentification...");

  // ✅ Attend que l'auth soit prête
  window.addEventListener("authReady", () => {
    isAuthReady.value = true;
  });

  try {
    const jwt = await getValidToken();
    
    if (!jwt) {
      console.warn("❌ Aucun JWT valide, redirection vers login...");
      await router.replace("/login");
    } else {
      console.log("✅ JWT valide, mise à jour de l'utilisateur...");
      await authStore.loadUser();
    }
  } catch (error) {
    console.error("❌ Erreur pendant la récupération du JWT :", error);
  } finally {
    isLoading.value = false; // Masque le loader
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
