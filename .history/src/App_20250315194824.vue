<script setup>
import { ref, onMounted } from "vue";

const isLoading = ref(true);

onMounted(() => {
  console.log("✅ Application montée !");
  isLoading.value = false; // On ne bloque plus le chargement, car `main.ts` gère déjà l'auth
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
