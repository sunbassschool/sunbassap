<script setup>
import { ref, onMounted } from "vue";
import { restoreTokensIfNeeded } from "@/utils/api.ts";

const isLoading = ref(true);

const isRestoringTokens = ref(true); // 🔥 Met à true au début pour afficher le loader

onMounted(async () => {
  if (isRestoringTokens.value) return; 
  isRestoringTokens.value = true;

  console.log("🔄 Vérification des tokens au démarrage...");
  await restoreTokensIfNeeded();

  // ✅ Vérifie si un token est valide après la restauration
  const jwt = await getValidToken();

  if (!jwt) {
    console.warn("⚠️ Aucun JWT valide, redirection vers login...");
    router.replace("/login");
  } else {
    console.log("✅ JWT valide trouvé, accès accordé !");
  }

  isRestoringTokens.value = false; // ✅ Active l'affichage du contenu
});

</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <!-- Un écran de chargement temporaire -->
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
