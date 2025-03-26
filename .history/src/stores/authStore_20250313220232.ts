import { defineStore } from "pinia";
import { ref } from "vue";
import {
  verifyIndexedDBSetup,
  preventIndexedDBCleanup,
  fixRefreshTokenStorage,
  syncRefreshToken,
  getValidToken,
  getUserInfoFromJWT,
  fetchNewJWT,
  isJwtExpired,
} from "@/utils/api.ts"; // Vérifie que les imports sont corrects

interface User {
  email: string;
  prenom: string;
  role: string;
  abonnement: string;
}

interface AuthState {
  user: User | null;
  jwt: string | null;
  refreshToken: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    jwt: null,
    refreshToken: null,
  }),

  actions: {
    setUserToken(token: string) {
      this.jwt = token;
    },

    setRefreshToken(token: string) {
      this.refreshToken = token;
    },

    async fetchUserData() {
      this.jwt = await getValidToken();
      this.user = getUserInfoFromJWT();
    },

    async initializeAuth() {
      const isAuthLoading = ref(true); // État de chargement local
      console.log("🔄 Initialisation de l'authentification...");

      try {
        await verifyIndexedDBSetup();
        preventIndexedDBCleanup();

        if (!localStorage.getItem("fixRefreshDone")) {
          console.log("🛠️ Correction du stockage du refresh token...");
          await fixRefreshTokenStorage();
          localStorage.setItem("fixRefreshDone", "true");
        }

        await syncRefreshToken();

        // 📌 Mise à jour immédiate du JWT
        const newJwt = await getValidToken();
        if (!newJwt || isJwtExpired(newJwt)) {
          console.warn("🚨 Aucun JWT valide après syncRefreshToken, re-génération...");
          await fetchNewJWT();
        }

        this.jwt = newJwt;
        this.user = getUserInfoFromJWT();

        console.log("✅ Authentification terminée !");
      } catch (error) {
        console.error("❌ Erreur d'initialisation :", error);
      } finally {
        isAuthLoading.value = false; // 🔄 Fin du chargement
      }
    },
  },
});
