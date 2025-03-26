import { defineStore } from "pinia";
import { getValidToken, getUserInfoFromJWT, getRefreshTokenFromDB, refreshToken } from "@/utils/api.ts"; // ✅ Vérifie le bon chemin
let userLoaded = false;
export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        jwt: null,
        refreshToken: null,
        forceRefresh: 0,
        isRefreshingToken: false,
    }),
    getters: {
        isLoggedIn: (state) => {
            if (!state.jwt)
                return false;
            try {
                const payload = JSON.parse(atob(state.jwt.split(".")[1]));
                const exp = payload.exp * 1000;
                return Date.now() < exp;
            }
            catch (e) {
                return false;
            }
        },
        isAdmin: (state) => state.user?.role === "admin",
    },
    actions: {
        setUserToken(token) {
            this.jwt = token;
        },
        setRefreshToken(token) {
            this.refreshToken = token;
        },
     async loadUser() {
  console.log("🔄 Chargement des infos utilisateur...");

  this.jwt = await getValidToken(); // gère tout, refresh inclus
  const refreshToken = await getRefreshTokenFromDB();

  const neverConnected = !this.jwt && !refreshToken;
  if (neverConnected) {
    console.log("🟢 Aucun token présent, utilisateur jamais connecté.");
    this.user = null;
    this.jwt = null;
    this.refreshToken = null;
    return;
  }

  if (!this.jwt) {
    console.warn("⚠️ Échec récupération d’un JWT valide, déconnexion.");
    this.logout(); // refreshToken existait mais ne permettait pas le refresh
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

  this.refreshToken = refreshToken;
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
                }
                else {
                    this.logout();
                }
            }
            catch (err) {
                console.error("❌ Erreur lors du refresh JWT :", err);
                this.logout();
            }
            finally {
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
