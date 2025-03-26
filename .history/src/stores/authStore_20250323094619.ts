import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT, getRefreshTokenFromDB, getToken  } from "@/utils/api.ts"; // ✅ Vérifie le bon chemin

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
  isRefreshingToken: boolean; // ✅ Ajoute cette ligne ici
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    jwt: null,
    refreshToken: null,
    forceRefresh: 0, // ✅ Initialise la variable à 0
    isRefreshingToken: false, // 🆕
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
    
      this.jwt = await getToken();
    
      // ✅ Vérifie si l'utilisateur n'a **jamais** été connecté
      const neverConnected = !this.jwt && !(await getRefreshTokenFromDB());
      if (neverConnected) {
        console.log("🟢 Aucun token présent, utilisateur jamais connecté.");
        this.user = null;
        this.jwt = null;
        this.refreshToken = null;
        return;
      }
    
      if (!this.jwt) {
        console.warn("⚠️ JWT absent ou invalide. Déconnexion.");
        this.logout(); // Cas normal : token expiré
        return;
      }
    
      const userInfo = getUserInfoFromJWT(this.jwt);
      if (userInfo) {
        this.user = userInfo;
        console.log("✅ Utilisateur mis à jour :", this.user);
      } else {
        console.warn("⚠️ Impossible d'extraire les infos utilisateur du JWT.");
        this.user = null;
      }
    
      this.refreshToken = await getRefreshTokenFromDB();
    }
    ,
    async refreshJwt() {
      this.isRefreshingToken = true;
    
      try {
        const newToken = await getToken(); // peut déclencher refresh interne
        if (newToken) {
          this.jwt = newToken;
          this.user = getUserInfoFromJWT(newToken);
        } else {
          this.logout(); // token non récupérable
        }
      } catch (err) {
        console.error("❌ Erreur lors du refresh JWT :", err);
        this.logout();
      } finally {
        this.isRefreshingToken = false;
      }
    }
,    
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
