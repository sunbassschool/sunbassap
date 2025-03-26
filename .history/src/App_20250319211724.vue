<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { getValidToken, verifyIndexedDBSetup, restoreTokensIfNeeded } from "@/utils/api.ts";
import router from "@/router";

const isLoading = ref(true);
const authStore = useAuthStore();
const isAuthenticated = ref(false); 

async function checkAuth() {
  console.log("🔄 Vérification de l'authentification...");

  try {
    const isDBReady = await verifyIndexedDBSetup();
    if (!isDBReady) {
      console.warn("⚠️ IndexedDB non prête. On laisse l'accès.");
      isLoading.value = false; // ❌ Ne bloque pas l'UI
      return;
    }

    // 🔄 Vérification des tokens
    const restored = await restoreTokensIfNeeded();
    if (!restored) {
      console.warn("⚠️ Aucun token restauré. IndexedDB peut être vide.");
      isLoading.value = false;
      return; // ❌ NE bloque PAS l'accès
    }

    const jwt = await getValidToken();
    isAuthenticated.value = !!jwt;

    if (isAuthenticated.value) {
      console.log("✅ JWT valide, mise à jour de l'utilisateur...");
      await authStore.loadUser();
    }
  } catch (error) {
    console.error("❌ Erreur pendant la récupération du JWT :", error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  checkAuth();
});
</script>
