<template>
  <!-- Écran de chargement -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- Interface principale -->
  <div v-show="!isLoading" class="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { getValidToken, verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const isAuthenticated = ref(false); // ✅ Nouveau : ne pas rediriger directement
const authStore = useAuthStore();

let isCheckingAuth = false;  // ✅ Drapeau pour éviter les appels en boucle

async function checkAuth() {
  if (isCheckingAuth) {
    console.warn("⚠️ Authentification déjà en cours, on ignore.");
    return;
  }
  isCheckingAuth = true;

  console.log("🔄 Vérification de l'authentification...");

  try {
    console.log("🔄 Vérification IndexedDB...");
    const isDBReady = await verifyIndexedDBSetup();
    
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête, redirection vers login...");
      await router.replace("/login");
      return;
    }

    console.log("🔄 Restauration des tokens...");
    const restored = await restoreTokensIfNeeded();
    
    if (!restored) {
      console.warn("❌ Impossible de restaurer les tokens, redirection vers login...");
      await router.replace("/login");
      return;
    }

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
    isCheckingAuth = false; // ✅ Libération du drapeau
    isLoading.value = false;
  }
}

onMounted(() => {
  checkAuth();
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
