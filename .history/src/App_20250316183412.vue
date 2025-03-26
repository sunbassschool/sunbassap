<script setup>
import { ref, onMounted, nextTick } from "vue";
import { restoreTokensIfNeeded, getValidToken } from "@/utils/api.ts"; // 🔥 Supprime `restoreTokensToIndexedDBIfMissing`
import router from "@/router";

const isLoading = ref(true);
const isTimeout = ref(false);

// ✅ Gestion dynamique du logo
const baseUrl = import.meta.env.VITE_BASE_URL || "/app/";
const logoUrl = ref(`${baseUrl}images/logo.png`);

onMounted(async () => {
  console.log("🔄 Restauration des tokens en cours...");

  // ✅ Timeout pour afficher un message après 7s
  const timeout = setTimeout(() => {
    isTimeout.value = true;
  }, 7000);

  try {
    await restoreTokensIfNeeded(); // 🔄 Restaure les tokens

    const jwt = await getValidToken(); // 🔥 Vérifie si un JWT valide est dispo

    if (!jwt) {
      console.warn("❌ Aucun JWT valide, redirection vers login...");
      await router.replace("/login"); // 🔄 Redirige vers login si pas authentifié
    }
  } catch (error) {
    console.error("❌ Erreur pendant la restauration des tokens :", error);
  } finally {
    clearTimeout(timeout);
    await nextTick(); // ✅ Attendre que Vue mette à jour l'affichage
    isLoading.value = false; // ✅ 🔥 Met FIN au chargement quoi qu'il arrive
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <img :src="logoUrl" alt="Logo SunBassSchool" class="loading-logo" />
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
    <p v-if="isTimeout" class="timeout-message">
      ⚠️ Temps de chargement long ?
      <router-link to="/login">Se reconnecter</router-link>
    </p>
  </div>

  <div v-else class="app-container">
    <router-view />
  </div>
</template>

<style>
/* 🌑 UI sombre & contrastée */
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
  background: #121212;
  z-index: 9999;
}

/* 🔥 Effet néon sur le texte */
.loading-text {
  font-size: 1.5rem;
  color: #ff7300;
  margin-top: 10px;
  text-shadow: 0 0 15px rgba(255, 115, 0, 0.9);
}

/* ⏳ Loader circulaire */
.loader {
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
