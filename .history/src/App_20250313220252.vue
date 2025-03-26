<template>
  <div id="app">
    <div v-if="authStore.jwt === null" class="loading-screen">
      🔄 Chargement de l'authentification...
    </div>
    <router-view v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from "@/store/auth";
import { onMounted } from "vue";

const authStore = useAuthStore();

onMounted(() => {
  authStore.initializeAuth();
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
