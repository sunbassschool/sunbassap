<template>
  <div v-if="!authCheckComplete" class="loading-screen">
    <p>🔄 Vérification de votre session...</p>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref, onMounted } from "vue";

const authCheckComplete = ref(false);

onMounted(() => {
  window.addEventListener("auth-checked", () => {
    authCheckComplete.value = true;
  });

  // ⏳ Timeout pour éviter un blocage infini
  setTimeout(() => {
    if (!authCheckComplete.value) {
      console.warn("⚠️ Timeout: affichage forcé de l'UI après 3s.");
      authCheckComplete.value = true;
    }
  }, 3000);
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
