import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT, refreshToken } from "@/utils/api.ts";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    jwt: null,
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
    // Méthode pour définir le token utilisateur
    setUserToken(token) {
      this.jwt = token;
      console.log("JWT mis à jour : ", token);
    },

    async loadUser() {
      console.log("🔄 Chargement des infos utilisateur...");
      
      try {
        // Récupérer un JWT valide (qui sera rafraîchi si nécessaire)
        this.jwt = await getValidToken();
        
        if (!this.jwt) {
          console.warn("⚠️ Aucun JWT valide trouvé");
          return this.logout();
        }

        // Extraction des infos utilisateur à partir du JWT
        this.user = getUserInfoFromJWT(this.jwt);

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
      if (this.isRefreshingToken || Date.now() - this.lastRefreshAttempt < 5000) {
        return;
      }
    
      this.isRefreshingToken = true;
      this.lastRefreshAttempt = Date.now();
    
      let delayTimeout;
      try {
        // 💡 Si ça prend plus de 600ms, afficher le "isRefreshingToken"
        delayTimeout = setTimeout(() => {
          this.isRefreshingToken = true;
        }, 600);
    
        const newJwt = await refreshToken();
    
        if (!newJwt) {
          throw new Error("Refresh token a échoué");
        }
    
        this.setUserToken(newJwt);
        this.user = getUserInfoFromJWT(newJwt);
    
        console.log("🔄 Token rafraîchi avec succès");
        return true;
    
      } catch (error) {
        console.error("❌ Échec du refresh :", error);
        this.logout();
        return false;
      } finally {
        clearTimeout(delayTimeout);
        this.isRefreshingToken = false;
      }
    }
    ,

    logout() {
      console.log("🚪 Déconnexion en cours...");
      
      this.jwt = null;
      this.user = null;
      
      // Nettoyage du storage
      ['jwt', 'refreshToken'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log("✅ Déconnexion réussie");
    },

    triggerRefresh() {
      if (!this.isRefreshingToken) {
        this.refreshJwt();
      }
    }
  }
});
