<template>
   <div id="loading-screen">
      <div class="loading-content">
        <img id="loading-logo" src="/images/logo.png" alt="Chargement..." />

      
      </div>
    </div>
  <router-view v-else />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const authCheckComplete = ref(false);

const handleAuthChecked = () => {
  authCheckComplete.value = true;
};

onMounted(() => {
  window.addEventListener("auth-checked", handleAuthChecked);

  // ⏳ Timeout pour éviter un blocage infini
  setTimeout(() => {
    if (!authCheckComplete.value) {
      console.warn("⚠️ Timeout: affichage forcé de l'UI après 3s.");
      authCheckComplete.value = true;
    }
  }, 3000);
});

onUnmounted(() => {
  window.removeEventListener("auth-checked", handleAuthChecked);
});
</script>

<style>
/* 🌑 Style de l'écran de chargement */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #1a1a1a; /* Fix couleur */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}
</style>
