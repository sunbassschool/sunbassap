<template>
  <div id="app">
    <div v-if="!authCheckComplete" class="loading-screen">
      <p>🔄 Vérification de votre session...</p>
    </div>
    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

// ✅ Variable pour suivre si l'authentification est terminée
const authCheckComplete = ref(false);

onMounted(() => {
  window.addEventListener("auth-checked", () => {
    authCheckComplete.value = true;
  });
});
</script>

<style>
.loading-screen {
  position: fixed;
  width: 100vw;
  height: 100vh;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
</style>
