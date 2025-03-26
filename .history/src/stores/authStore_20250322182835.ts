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
  forceRefresh: number; // ✅ Ajout de la variable réactive
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    jwt: null,
    refreshToken: null,
    forceRefresh: 0, // ✅ Initialise la variable à 0
  }),

  getters: {
    isLoggedIn: (state) => {
      if (!state.jwt) return false;
      try {
        const payload = JSON.parse(atob(state.jwt.split(".")[1]));
        const exp = payload.exp * 1000;
        return Date.now() < exp;
      } catch (e) {
        return false;
      }
    },
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
      this.jwt = await getToken();

      if (!this.jwt) {
        console.warn("⚠️ Aucun JWT valide trouvé.");
        this.logout(); // <--- important !
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

    // ✅ Ajoute cette action pour forcer le re-render
    triggerRefresh() {
      this.forceRefresh = Date.now(); // 🔥 Change la valeur pour forcer la mise à jour
    },
  },
});
