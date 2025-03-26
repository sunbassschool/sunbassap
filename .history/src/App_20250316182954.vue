<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { restoreTokensIfNeeded, restoreTokensToIndexedDBIfMissing, getValidToken } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const isTimeout = ref(false);
const route = useRoute(); // ✅ Récupère la route actuelle

onMounted(async () => {
  console.log("🔄 Restauration des tokens en cours...");

  const timeout = setTimeout(() => {
    isTimeout.value = true;
  }, 7000);

  try {
    await restoreTokensIfNeeded();
    await restoreTokensToIndexedDBIfMissing();

    const jwt = await getValidToken();
    
    if (!jwt) {
      console.warn("❌ Aucun JWT valide, redirection vers login...");
      await router.replace("/login");
    }
  } catch (error) {
    console.error("❌ Erreur pendant la restauration des tokens :", error);
  } finally {
    clearTimeout(timeout);
    isLoading.value = false; // ✅ Assurer que l'affichage passe bien en mode "chargé"
  }
});

// ✅ Si on navigue, on s'assure que `isLoading` passe à `false`
watch(route, () => {
  isLoading.value = false;
});
</script>

<template>
  <div class="app-container">
    <!-- ✅ Logo SunBassSchool -->
    <div v-if="isLoading" class="logo-container">
      <img :src="logoUrl" alt="Logo SunBassSchool" class="app-logo">
    </div>

    <!-- ✅ Spinner de chargement -->
    <div v-if="isLoading" class="loading-screen">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="loading-text">Chargement en cours...</p>
      <p v-if="isTimeout" class="timeout-message">
        ⚠️ Temps de chargement anormalement long ? 
        <router-link to="/login">Se reconnecter</router-link>
      </p>
    </div>

    <!-- ✅ Affichage principal -->
    <div v-else class="app-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
/* 🌑 UI sombre cohérente */
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom left, rgb(17, 9, 9), rgb(0, 0, 0));
}

/* ✅ Conteneur du logo */
.logo-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ✅ Style du logo */
.app-logo {
  width: 120px;
  height: auto;
  animation: fadeIn 1.5s ease-in-out;
}

/* 🔄 Écran de chargement */
.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

/* 🔥 Effet néon sur le texte */
.loading-text {
  font-size: 1.5rem;
  color: #ff7300;
  text-shadow: 0 0 15px rgba(255, 115, 0, 0.9);
  margin-top: 10px;
}

/* 🎡 Spinner circulaire */
.spinner-border {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 115, 0, 0.2);
  border-top: 5px solid #ff7300;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ⚠️ Message si timeout */
.timeout-message {
  color: #ff4444;
  font-size: 1rem;
  margin-top: 15px;
  text-align: center;
}
.timeout-message a {
  color: #ff7300;
  text-decoration: none;
  font-weight: bold;
}

/* 🚀 Animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ✅ Affichage principal */
.app-content {
  opacity: 0;
  animation: fadeIn 0.5s ease-in-out forwards;
}
</style>
