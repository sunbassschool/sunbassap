import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT } from "@/utils/auth.js"; // Assure-toi du bon chemin

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    jwt: null,
    refreshToken: null,
  }),

  actions: {
    setUserToken(token) {
      this.jwt = token;
    },

    setRefreshToken(token) {
      this.refreshToken = token;
    },

    async fetchUserData() {
      this.jwt = await getValidToken(); // 🔄 Récupère un JWT valide
      this.user = getUserInfoFromJWT(); // 🔄 Met à jour l'utilisateur
    }
  }
});
