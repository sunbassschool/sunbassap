<script setup>
import { ref, onMounted } from "vue";
import { restoreTokensIfNeeded, getValidToken } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);

onMounted(async () => {
  console.log("🔄 Restauration des tokens...");

  try {
    await restoreTokensIfNeeded();
    
    // ✅ Vérification finale du JWT après restauration
    const jwt = await getValidToken();

    if (!jwt) {
      console.warn("❌ Aucun JWT valide après restauration, redirection vers login...");
      await router.replace("/login"); // ✅ Attendre la redirection avant de masquer le loader
    } else {
      console.log("✅ Tokens restaurés !");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des tokens :", error);
    await router.replace("/login"); // ✅ Redirection immédiate en cas d'échec
  } finally {
    isLoading.value = false; // ✅ S'assurer que le chargement disparaît dans tous les cas
  }
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
