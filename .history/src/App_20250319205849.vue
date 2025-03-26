<template>
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <div v-show="!isLoading" class="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { getValidToken, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const authStore = useAuthStore();

async function checkAuth() {
  console.log("🔄 Vérification de l'authentification...");

  try {
    await restoreTokensIfNeeded();
    const jwt = await getValidToken();

    if (!jwt) {
      console.warn("❌ Aucun JWT valide, redirection vers login...");
      await router.replace("/login");
    } else {
      console.log("✅ JWT valide, mise à jour de l'utilisateur...");
      await authStore.loadUser();
    }
  } catch (error) {
    console.error("❌ Erreur d'authentification :", error);
  } finally {
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
  background: #000;
  z-index: 9999;
}
</style>
