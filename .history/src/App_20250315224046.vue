<script setup>
import { ref, onMounted } from "vue";
import { restoreTokensIfNeeded, getValidToken } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);

onMounted(async () => {
  console.log("🔄 Restauration des tokens en cours...");

  await restoreTokensIfNeeded(); // ✅ Restaure les tokens depuis IndexedDB

  const jwt = await getValidToken(); // 🔥 Vérifie si un JWT valide est dispo après restauration

  if (!jwt) {
    console.warn("❌ Aucun JWT valide, redirection vers login...");
    router.replace("/login"); // 🔄 Redirige vers login si pas authentifié
  } else {
    console.log("✅ JWT valide trouvé, accès autorisé !");
  }

  isLoading.value = false; // ✅ Active l'affichage de l'application
});
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <p>Chargement...</p>
  </div>

  <div v-else>
    <router-view />
  </div>
</template>

<style>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  z-index: 9999;
}
</style>
