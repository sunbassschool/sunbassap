<template>
  <div id="app">
    <div v-if="isAuthLoading" class="loading-screen">
      🔄 Chargement de l'authentification...
    </div>
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const isAuthLoading = ref(true);

onMounted(async () => {
  console.log("🔄 Attente de l'authentification...");
  await new Promise((resolve) => {
    window.addEventListener("auth-ready", resolve, { once: true });
  });
  isAuthLoading.value = false;
  console.log("✅ Authentification terminée !");
});
</script>

<style>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  font-size: 1.5rem;
}
</style>
