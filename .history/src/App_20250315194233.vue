<script setup>
import { ref, onMounted } from "vue";
import { restoreTokensIfNeeded } from "@/utils/api.ts";

const isLoading = ref(true);
const isRestoringTokens = ref(false);

onMounted(async () => {
  if (isRestoringTokens.value) return;
  isRestoringTokens.value = true;

  console.log("🔄 Vérification des tokens au démarrage...");
  await restoreTokensIfNeeded();
  isRestoringTokens.value = false;
  const isLoading = ref(true);
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
