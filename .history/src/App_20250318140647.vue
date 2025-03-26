<template>
  <!-- ✅ Écran de chargement (visible tant que `isLoading = true`) -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- ✅ Interface principale (s'affiche une fois le chargement terminé) -->
  <div v-else>
    <router-view v-if="router.isReady()" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import router from "@/router";

const isLoading = ref(true); // ✅ Par défaut, affichage de l'écran de chargement
const authStore = useAuthStore();

// ✅ Vérifier quand l'authentification est terminée
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    console.log("✅ Authentification réussie, arrêt du chargement !");
    isLoading.value = false;
  }
});

// ✅ Gérer l'initialisation et s'assurer que `isLoading` fonctionne
onMounted(async () => {
  console.log("🔄 Début de l'initialisation de App.vue...");
  isLoading.value = true; // ✅ Toujours activer `isLoading` au début

  try {
    await authStore.loadUser();
    await router.isReady();

    console.log("✅ Tout est prêt, fin du chargement !");
    isLoading.value = false;
  } catch (error) {
    console.error("❌ Erreur pendant l'initialisation de l'application :", error);
    isLoading.value = false;
  }
});
</script>

<style>
/* ✅ Assurer que l'écran de chargement est bien visible */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #000000;
  z-index: 9999;
}
</style>
