<template>
  <div v-if="!authCheckComplete" class="loading-screen">
    <div id="loading-screen">
      <div class="loading-content">
        <img id="loading-logo" src="/images/logo.png" alt="Chargement..." />
      </div>
    </div>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { getToken, isJwtExpired, refreshToken } from "@/utils/api"; // 🔄 Import des fonctions liées au JWT

const authCheckComplete = ref(false);

const checkAuthentication = async () => {
  console.log("🔍 Vérification de l'authentification...");

  let jwt = await getToken();

  if (!jwt || isJwtExpired(jwt)) {
    console.log("⏳ Aucun JWT valide, tentative de refresh...");
    try {
      const newJwt = await refreshToken();
      if (newJwt) {
        console.log("✅ JWT rafraîchi avec succès !");
      } else {
        console.warn("🚨 Impossible de rafraîchir le JWT.");
      }
    } catch (error) {
      console.error("❌ Erreur lors du refresh :", error);
    }
  } else {
    console.log("✅ JWT valide trouvé !");
  }

  authCheckComplete.value = true;
  window.dispatchEvent(new Event("auth-checked"));
};

const handleAuthChecked = () => {
  authCheckComplete.value = true;
};

onMounted(() => {
  window.addEventListener("auth-checked", handleAuthChecked);
  checkAuthentication();

  // ✅ Timeout intelligent : si le check prend trop de temps, on affiche l'UI
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
