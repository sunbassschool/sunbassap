import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT } from "@/utils/auth"; // Assure-toi du bon chemin

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
      this.jwt = await getValidToken(); // 🔄 Récupère un JWT valide
      this.user = getUserInfoFromJWT(); // 🔄 Met à jour l'utilisateur
    },
  },
});
