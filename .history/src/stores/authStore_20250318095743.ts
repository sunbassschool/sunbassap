import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT, getRefreshTokenFromDB } from "@/utils/api.ts"; // ✅ Vérifie le bon chemin

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

  getters: {
    isLoggedIn: (state) => !!state.jwt, // ✅ Retourne `true` si un JWT est présent
    isAdmin: (state) => state.user?.role === "admin", // ✅ Vérifie si l'utilisateur est admin
  },

  actions: {
    setUserToken(token: string) {
      this.jwt = token;
    },

    setRefreshToken(token: string) {
      this.refreshToken = token;
    },

    async loadUser() {
      console.log("🔄 Chargement des infos utilisateur...");
      
      // 🔥 Récupère le JWT valide
      this.jwt = await getValidToken();
      
      if (!this.jwt) {
        console.warn("⚠️ Aucun JWT valide trouvé.");
        this.user = null;
        return;
      }

      // 🔄 Extraction des infos utilisateur depuis le JWT
      const userInfo = getUserInfoFromJWT(this.jwt);

      if (userInfo) {
        this.user = userInfo;
        console.log("✅ Utilisateur mis à jour :", this.user);
      } else {
        console.warn("⚠️ Impossible d'extraire les infos utilisateur du JWT.");
        this.user = null;
      }

      // 🔄 Récupération du refreshToken depuis IndexedDB
      this.refreshToken = await getRefreshTokenFromDB();
    },

    logout() {
      console.warn("🚪 Déconnexion de l'utilisateur...");
      this.jwt = null;
      this.refreshToken = null;
      this.user = null;
      localStorage.removeItem("jwt");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("jwt");
      sessionStorage.removeItem("refreshToken");
    },
  },
});
