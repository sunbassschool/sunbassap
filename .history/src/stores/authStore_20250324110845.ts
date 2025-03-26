import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT, getRefreshTokenFromDB, getToken, refreshToken   } from "@/utils/api.ts"; // ✅ Vérifie le bon chemin

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
let userLoaded = false;
export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    jwt: null,
    refreshToken: null,
    forceRefresh: 0,
    isRefreshingToken: false,
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
    isAdmin: (state) => state.user?.role === "admin",
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
    
      this.jwt = await getValidToken();
    
      // 🔁 Tentative d'extraction du refreshToken depuis IndexedDB
      let refresh = await getRefreshTokenFromDB();
    
      // 🔁 Fallback si DB vide → on regarde dans localStorage
      if (!refresh) {
        const localRefresh = localStorage.getItem("refreshToken");
        if (localRefresh) {
          console.log("🟠 refreshToken trouvé en localStorage (fallback)");
          refresh = localRefresh;
        }
      }
    
      // 🧼 Cas d’utilisateur jamais connecté
      if (!this.jwt && !refresh) {
        console.log("🟢 Aucun token présent, utilisateur jamais connecté.");
        this.user = null;
        this.jwt = null;
        this.refreshToken = null;
        return;
      }
    
      // 🔄 Si le JWT est invalide, on tente un refresh
      if (!this.jwt && refresh) {
        console.warn("⚠️ JWT absent, tentative de refresh avec token local...");
        await this.refreshJwt(); // Ce call remplira jwt + user + refreshToken
        return;
      }
    
      // ✅ Extraction infos depuis JWT
      const userInfo = getUserInfoFromJWT(this.jwt);
      if (userInfo) {
        this.user = userInfo;
        console.log("✅ Utilisateur mis à jour :", this.user);
      } else {
        console.warn("⚠️ Impossible d'extraire les infos utilisateur du JWT.");
        this.user = null;
      }
    
      this.refreshToken = refresh;
    }
    
    ,

    async refreshJwt() {
      this.isRefreshingToken = true;
      try {
        // 🔄 On force un vrai appel à refreshToken()
        const newJwt = await refreshToken();
    
        if (newJwt) {
          this.jwt = newJwt;
          this.user = getUserInfoFromJWT(newJwt);
    
          // 🔁 Recharge aussi le refreshToken depuis IndexedDB
          this.refreshToken = await getRefreshTokenFromDB();
    
          console.log("✅ Nouveau JWT chargé :", this.jwt);
          console.log("👤 Infos utilisateur :", this.user);
        } else {
          this.logout();
        }
      } catch (err) {
        console.error("❌ Erreur lors du refresh JWT :", err);
        this.logout();
      } finally {
        this.isRefreshingToken = false;
      }
    },

    logout() {
      console.warn("🚪 Déconnexion de l'utilisateur...");
      this.jwt = null;
      this.refreshToken = null;
      this.user = null;
      userLoaded = false; // 🔁 Permet de recharger plus tard si besoin
      localStorage.removeItem("jwt");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("jwt");
      sessionStorage.removeItem("refreshToken");
    },

    triggerRefresh() {
      this.forceRefresh = Date.now();
    },
  },
});
