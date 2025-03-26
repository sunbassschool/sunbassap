<script setup>
import { ref, onMounted } from "vue";
import { restoreTokensIfNeeded } from "@/utils/api.ts";

const isLoading = ref(true);

onMounted(async () => {
  console.log("🔄 Restauration des tokens...");
  await restoreTokensIfNeeded();
  console.log("✅ Tokens restaurés !");
  isLoading.value = false;
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
