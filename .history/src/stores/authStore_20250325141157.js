import { defineStore } from "pinia";
import { 
  getValidToken, 
  getUserInfoFromJWT, 
  getRefreshTokenFromDB, 
  refreshToken 
} from "@/utils/api.ts";

// Variable module pour éviter les doublons
let userLoadPromise = null;

export const useAuthStore = defineStore("auth", {
    state: () => ({
      user: null,
      jwt: null,
      refreshToken: null,
      isRefreshingToken: false,
      lastRefreshAttempt: 0
    }),
  
    getters: {
      isLoggedIn: (state) => !!state.jwt && !state.isRefreshingToken,
      isAdmin: (state) => state.user?.role === "admin",
      needsRefresh: (state) => {
        if (!state.jwt || state.isRefreshingToken) return false;
        try {
          const payload = JSON.parse(atob(state.jwt.split('.')[1]));
          return (payload.exp * 1000 - Date.now()) < 300000;
        } catch {
          return false;
        }
      },
      authStatus() {
        if (!this.jwt) return 'logged_out';
        if (this.isRefreshingToken) return 'refreshing';
        if (this.needsRefresh) return 'needs_refresh';
        return 'logged_in';
      }
    },
  
    actions: {
      async loadUser() {
        if (userLoadPromise) return userLoadPromise;
  
        // Si aucun JWT n'est présent, on ne tente pas de charger l'utilisateur
        if (!this.jwt) {
          console.warn("🚨 Aucun JWT trouvé, déconnexion...");
          return this.logout();  // Déconnexion ou autre gestion
        }
  
        console.log("🔄 Chargement UNIQUE des infos utilisateur...");
  
        try {
          userLoadPromise = (async () => {
            this.jwt = await getValidToken();
            if (!this.jwt) throw new Error("No valid JWT");
  
            this.user = getUserInfoFromJWT(this.jwt);
            this.refreshToken = await getRefreshTokenFromDB();
            if (!this.user) throw new Error("Invalid user data");
  
            console.log("✅ Utilisateur chargé :", this.user);
            return true;
          })();
  
          return await userLoadPromise;
        } catch (error) {
          userLoadPromise = null;
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
  
        try {
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
          userLoadPromise = null;
        }
      },
  
      logout() {
        userLoadPromise = null;
        this.isRefreshingToken = false;
  
        this.$patch({
          jwt: null,
          user: null,
          refreshToken: null
        });
  
        requestIdleCallback(() => {
          ['jwt', 'refreshToken'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          console.log("✅ Déconnexion réussie");
        });
      }
    }
  });
  