<template>
  <div class="app-container">
    <RefreshOverlay v-if="authStore.isRefreshingToken" />
    <router-view />
    <SwUpdateToast ref="swToastRef" />
  </div>
</template>




<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";
import RefreshOverlay from "@/components/RefreshOverlay.vue";

const isAuthenticated = ref(false);
const authStore = useAuthStore();

async function checkAuth() {
  console.log("🔄 Vérification de l'authentification...");

  const currentRoute = router.currentRoute.value;
  console.log("📌 Route actuelle :", currentRoute.path);
  console.log("🔍 meta.requiresAuth =", currentRoute.meta.requiresAuth);

  if (!currentRoute.meta.requiresAuth) {
    console.log("✅ Page publique détectée, pas de redirection !");
    return;
  }

  try {
    await verifyIndexedDBSetup();
    await restoreTokensIfNeeded();

    await authStore.loadUser(); // ✅ C’est ici que tout est géré maintenant

    if (!authStore.jwt) {
      console.warn("🚨 Aucun JWT valide, redirection forcée !");
      router.push("/login");
    } else {
      console.log("✅ JWT valide, accès autorisé !");
      isAuthenticated.value = true;

      let prenom =
        localStorage.getItem("prenom") ||
        sessionStorage.getItem("prenom") ||
        authStore.user?.prenom;

      if (!prenom) {
        console.warn("⚠️ Aucun prénom trouvé, utilisation d'une valeur par défaut.");
        prenom = "Utilisateur";
      } else {
        console.log("✅ Prénom récupéré :", prenom);
        localStorage.setItem("prenom", prenom);
      }
    }
  } catch (error) {
    console.error("❌ Erreur dans checkAuth :", error);
    router.push("/login");
  }
}

onMounted(async () => {
  await router.isReady();
  await checkAuth();

  // 🎯 Enregistrement SW avec affichage toast
  registerSW({
    onNeedRefresh() {
      swToastRef.value?.show();
    },
    onOfflineReady() {
      console.log('✅ App prête hors ligne');
    }
  });
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
