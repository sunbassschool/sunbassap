<script setup>
import { ref, onMounted, nextTick, defineAsyncComponent } from "vue";
import { restoreTokensIfNeeded, getValidToken } from "@/utils/api.ts";
import router from "@/router";

// ✅ Chargement dynamique du Layout pour éviter les erreurs
const Layout = defineAsyncComponent(() => import("@//Layout.vue"));

const isLoading = ref(true);

onMounted(async () => {
  console.log("🔄 Restauration des tokens...");

  try {
    await restoreTokensIfNeeded();
    
    // ✅ Vérification finale du JWT après restauration
    const jwt = await getValidToken();

    if (!jwt) {
      console.warn("❌ Aucun JWT valide après restauration, redirection vers login...");
      await nextTick(); // 🔥 Attend la mise à jour du DOM avant de rediriger
      router.replace("/login");
    } else {
      console.log("✅ Tokens restaurés !");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des tokens :", error);
    await nextTick();
    router.replace("/login");
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    <p>Chargement...</p>
  </div>

  <Layout v-else>
    <router-view />
  </Layout>
</template>

<style>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  z-index: 9999;
}
</style>
