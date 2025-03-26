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
/* 🌑 UI sombre */
body {
  background: #121212;
  color: #fff;
  font-family: "Arial", sans-serif;
  margin: 0;
  padding: 0;
}

/* 🔄 Écran de chargement */
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

/* 🔥 Effet néon sur le texte */
.loading-text {
  font-size: 0.8rem;
  color: #ff0800ee;
  margin-top: 10px;
}

/* ⏳ Loader circulaire */
.loader {
  width: 20px;
  height: 20px;
  border: 5px solid rgb(54, 54, 54);
  border-top: 5px solid #790404;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ⚠️ Message si timeout */
.timeout-message {
  color: #7a7a7a;
  font-size: 1rem;
  margin-top: 15px;
  text-align: center;
}
.timeout-message a {
  color: #ff7300;
  text-decoration: none;
  font-weight: bold;
}

/* 🎡 Animation du spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 🌆 Animation d’apparition */
.app-container {
  opacity: 0;
  animation: fadeIn 0.5s ease-in-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
