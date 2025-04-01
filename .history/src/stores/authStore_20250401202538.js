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
        const rawUser = getUserInfoFromJWT(this.jwt);
        if (rawUser?.prenom) {
          try {
            rawUser.prenom = decodeURIComponent(escape(rawUser.prenom));
          } catch (err) {
            console.warn("⚠️ Échec de correction UTF-8 prénom :", rawUser.prenom);
          }
        }
        this.user = rawUser;

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
      if (this.isRefreshingToken) {
        console.log("🛑 Rafraîchissement déjà en cours...");
        return; // Si un rafraîchissement est déjà en cours, on sort de la méthode
      }
    
      this.isRefreshingToken = true; // 🟢 On signale que le refresh commence
    
      try {
        const response = await refreshToken();  // Fonction de rafraîchissement du token
    
        if (!response?.jwt) {
          throw new Error("Échec du refresh");
        }

        // Mise à jour du JWT
        this.setUserToken(response.jwt);
        this.setRefreshToken(response.refreshToken);
    
        return response.jwt;
      } catch (err) {
        console.error("❌ Refresh échoué :", err);
        this.logout();  // Déconnexion si le rafraîchissement échoue
        return null;
      } finally {
        this.isRefreshingToken = false; // 🔴 Fin du rafraîchissement
      }
    },

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
        console.log("🔄 Tentative de rafraîchissement...");
        this.refreshJwt();  // Appeler le rafraîchissement si aucun rafraîchissement n'est en cours
      } else {
        console.log("🛑 Rafraîchissement déjà en cours...");
      }
    }
  }
});
