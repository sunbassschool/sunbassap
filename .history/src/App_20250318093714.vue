<script setup>
import { ref, onMounted, nextTick } from "vue";
import { restoreTokensIfNeeded, restoreTokensToIndexedDBIfMissing, getValidToken } from "@/utils/api.ts";
import { useAuthStore } from "@/stores/authStore";
import router from "@/router";

const isLoading = ref(true);
const isTimeout = ref(false);
const appKey = ref(0); // 🔄 Clé pour forcer le rechargement de l'UI
const authStore = useAuthStore();

onMounted(async () => {
  console.log("🔄 Restauration des tokens en cours...");

  // ✅ Timeout pour afficher un message si le chargement est trop long
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
    } else {
      console.log("✅ JWT valide, mise à jour de l'utilisateur...");
      await authStore.loadUser(); // 🔄 Charge les infos utilisateur après refresh

      // ✅ Forcer Vue à recharger l’UI UNIQUEMENT après un refresh
      nextTick(() => {
        console.log("🔄 UI rechargée après refresh");
        appKey.value++; // 🔥 Change la clé pour forcer un re-render sans boucle infinie
      });
    }
  } catch (error) {
    console.error("❌ Erreur pendant la restauration des tokens :", error);
  } finally {
    clearTimeout(timeout);
    isLoading.value = false; // ✅ Masque le loader
  }
});
</script>

<template>
  <!-- 🌑 Écran de chargement -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
    <p v-if="isTimeout" class="timeout-message">
      ⚠️ Temps de chargement anormalement long ? 
      <router-link to="/login">Se reconnecter</router-link>
    </p>
  </div>

  <!-- 🎨 Interface principale -->
  <div v-else :key="appKey" class="app-container">
    <router-view />
  </div>
</template>

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
