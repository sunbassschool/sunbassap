import { defineStore } from "pinia";
import { 
  getValidToken, 
  getUserInfoFromJWT, 
  getRefreshTokenFromDB, 
  refreshToken 
} from "@/utils/api.ts";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    jwt: null,
    refreshToken: null,
    isRefreshingToken: false,
    lastRefreshAttempt: 0
  }),

  getters: {
    isLoggedIn: (state) => {
      if (!state.jwt) return false;
      try {
        const payload = JSON.parse(atob(state.jwt.split('.')[1]));
        return Date.now() < payload.exp * 1000;
      } catch {
        return false;
      }
    },
    isAdmin: (state) => state.user?.role === "admin",
    needsRefresh: (state) => {
      if (!state.jwt) return false;
      try {
        const payload = JSON.parse(atob(state.jwt.split('.')[1]));
        const expiresIn = payload.exp * 1000 - Date.now();
        return expiresIn < 300000; // 5 minutes avant expiration
      } catch {
        return false;
      }
    }
  },

  actions: {
    async loadUser() {
      console.log("🔄 Chargement des infos utilisateur...");
      
      try {
        this.jwt = await getValidToken();
        
        if (!this.jwt) {
          console.warn("⚠️ Aucun JWT valide trouvé");
          return this.logout();
        }

        this.user = getUserInfoFromJWT(this.jwt);
        this.refreshToken = await getRefreshTokenFromDB();

        if (!this.user) {
          console.warn("⚠️ Impossible d'extraire les infos utilisateur");
          return this.logout();
        }

        console.log("✅ Utilisateur chargé :", this.user);
        return true;
        
      } catch (error) {
        console.error("❌ Erreur lors du chargement :", error);
        return this.logout();
      }
    },

    async refreshJwt() {
      // Évite les refresh concurrents
      if (this.isRefreshingToken || Date.now() - this.lastRefreshAttempt < 5000) {
        return;
      }

      this.isRefreshingToken = true;
      this.lastRefreshAttempt = Date.now();
      
      try {
        const newJwt = await refreshToken();
        
        if (!newJwt) {
          throw new Error("Refresh token a échoué");
        }

        this.jwt = newJwt;
        this.user = getUserInfoFromJWT(newJwt);
        this.refreshToken = await getRefreshTokenFromDB();

        console.log("🔄 Token rafraîchi avec succès");
        return true;
        
      } catch (error) {
        console.error("❌ Échec du refresh :", error);
        this.logout();
        return false;
      } finally {
        this.isRefreshingToken = false;
      }
    },

    logout() {
      console.log("🚪 Déconnexion en cours...");
      
      this.jwt = null;
      this.user = null;
      this.refreshToken = null;
      
      // Nettoyage du storage
      ['jwt', 'refreshToken'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log("✅ Déconnexion réussie");
    },a

    // Pour forcer un refresh manuellement si besoin
    triggerRefresh() {
      if (!this.isRefreshingToken) {
        this.refreshJwt();
      }
    }
  }
});