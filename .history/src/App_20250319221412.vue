<template>
  <!-- 🌟 Écran de chargement global -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loader"></div>
    <p class="loading-text">Chargement en cours...</p>
  </div>

  <!-- 🌍 Contenu principal -->
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
const isAuthenticated = ref(false);
const authStore = useAuthStore();

async function checkAuth() {
  console.log("🔄 Vérification de l'authentification...");

  const currentRoute = router.currentRoute.value;
  console.log("📌 Route actuelle :", currentRoute.path);
  console.log("🔍 meta.requiresAuth =", currentRoute.meta.requiresAuth);

  // ✅ Si la route est publique, on n'affiche pas le loader trop longtemps
  if (!currentRoute.meta.requiresAuth) {
    console.log("✅ Page publique détectée, pas de redirection !");
    isLoading.value = false;
    return;
  }

  try {
    await verifyIndexedDBSetup();
    await restoreTokensIfNeeded();

    const jwt = await getValidToken();
    console.log("🔑 JWT trouvé ?", jwt);

    if (!jwt) {
      console.warn("🚨 Aucun JWT valide, redirection forcée !");
      router.push("/login");
    } else {
      console.log("✅ JWT valide, accès autorisé !");
      isAuthenticated.value = true;
    }
  } catch (error) {
    console.error("❌ Erreur dans checkAuth :", error);
    router.push("/login"); // 🔄 En cas d'erreur, on redirige aussi vers login
  } finally {
    isLoading.value = false; // 🔥 Masque le spinner après vérification
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
