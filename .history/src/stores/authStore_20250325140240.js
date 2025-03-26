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
  let userLoadPromise = null; // Garde-fou global
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
      // Si déjà en cours, retourne la même promesse
      if (userLoadPromise) {
        console.log("⏳ Chargement déjà en cours...");
        return userLoadPromise;
      }
    
      console.log("🔄 Chargement UNIQUE des infos utilisateur...");
      
      try {
        userLoadPromise = (async () => {
          this.jwt = await getValidToken();
          
          if (!this.jwt) {
            console.warn("⚠️ Aucun JWT valide trouvé");
            throw new Error("No valid JWT");
          }
    
          this.user = getUserInfoFromJWT(this.jwt);
          this.refreshToken = await getRefreshTokenFromDB();
    
          if (!this.user) throw new Error("Invalid user data");
    
          console.log("✅ Utilisateur chargé :", this.user);
          return true;
        })();
    
        return await userLoadPromise;
        
      } catch (error) {
        userLoadPromise = null; // Reset en cas d'erreur
        console.error("❌ Erreur lors du chargement :", error);
        return this.logout();
      }
    },

    async refreshJwt() {
        // Double protection contre les rafraîchissements concurrents
        if (this.isRefreshingToken) {
          console.log("⏳ Refresh déjà en cours...");
          return;
        }
      
        const now = Date.now();
        if (now - this.lastRefreshAttempt < 5000) {
          console.log("⏳ Refresh trop récent...");
          return;
        }
      
        this.isRefreshingToken = true;
        this.lastRefreshAttempt = now;
        
        try {
          console.log("🔄 Tentative de rafraîchissement du token...");
          const newJwt = await refreshToken();
          
          if (!newJwt) throw new Error("Refresh failed");
      
          this.jwt = newJwt;
          this.user = getUserInfoFromJWT(newJwt);
          this.refreshToken = await getRefreshTokenFromDB();
      
          console.log("✅ Token rafraîchi avec succès");
          return true;
          
        } catch (error) {
          console.error("❌ Échec du refresh :", error);
          this.logout();
          return false;
        } finally {
          this.isRefreshingToken = false;
          userLoadPromise = null; // Permet un rechargement
        }
      },

      logout() {
        // Annule les opérations en cours
        userLoadPromise = null;
        this.isRefreshingToken = false;
      
        console.log("🚪 Déconnexion en cours...");
        
        // Reset synchrone d'abord
        this.$patch({
          jwt: null,
          user: null,
          refreshToken: null
        });
      
        // Nettoyage async pour ne pas bloquer l'UI
        requestIdleCallback(() => {
          ['jwt', 'refreshToken'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          console.log("✅ Déconnexion réussie");
        });
      },

    // Pour forcer un refresh manuellement si besoin
    triggerRefresh() {
      if (!this.isRefreshingToken) {
        this.refreshJwt();
      }
    }
  }
});