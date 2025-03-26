<template>
  <!-- Écran de chargement -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- Interface principale -->
  <div v-show="!isLoading" class="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { getValidToken, verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const isAuthenticated = ref(false); // ✅ Nouveau : ne pas rediriger directement
const authStore = useAuthStore();

let isCheckingAuth = false;  // ✅ Drapeau pour éviter les appels en boucle

async function checkAuth() {
  console.log("🔄 Vérification de l'authentification...");

  const currentRoute = router.currentRoute.value;
  console.log("📌 Route actuelle :", currentRoute.path);
  console.log("🔍 meta.requiresAuth =", currentRoute.meta.requiresAuth);

  if (!currentRoute.meta.requiresAuth) {
    console.log("✅ Page publique détectée, pas de redirection !");
    isLoading.value = false;
    return;
  }

  try {
    await restoreTokensIfNeeded();
    const jwt = await getValidToken();
    console.log("🔑 JWT trouvé ?", jwt);

    if (!jwt) {
      console.warn("🚨 Aucun JWT valide, redirection forcée !");
      router.push("/login");
    }
  } catch (error) {
    console.error("❌ Erreur dans checkAuth :", error);
  } finally {
    isLoading.value = false;
  }
}


// ✅ Fonction pour masquer le spinner (déjà présente dans ton code)
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    setTimeout(() => (loadingScreen.style.display = "none"), 500);
  }
}



onMounted(() => {
  checkAuth();
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
