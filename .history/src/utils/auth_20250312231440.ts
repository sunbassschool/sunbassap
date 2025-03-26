import { getToken, setToken } from "@/utils/api";
import { openDB } from "idb"; // IndexedDB
import { useAuthStore } from "@/stores/authStore"; // Pinia
import router from "@/router";
import { jwtDecode } from "jwt-decode";

export async function getValidToken(): Promise<string | null> {
    try {
        const jwt = await getToken(); 
        const authStore = useAuthStore();

        if (jwt && !isTokenExpired(jwt)) {
            console.log("✅ JWT valide trouvé !");
            authStore.setUserToken(jwt);
            authStore.user = getUserInfoFromJWT(jwt); // 🔧 Correction ici
            return jwt;
        }

        console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
        const newJwt = await refreshToken();

        if (newJwt) {
            authStore.setUserToken(newJwt);
            authStore.user = getUserInfoFromJWT(newJwt); // 🔧 Correction ici
            return newJwt;
        }

        console.error("❌ Échec du rafraîchissement du token.");
        return null;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du token :", error);
        return null;
    }
}


// 🛠️ Eviter les boucles infinies dans le refresh
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let isRefreshing = false; // ✅ Flag de protection contre les appels concurrents

async function refreshToken(): Promise<string | null> {
    if (isRefreshing) {
        console.warn("⚠️ Un rafraîchissement est déjà en cours, attente...");
        return null;
    }

    if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
        console.error("❌ Trop de tentatives de refresh échouées. Déconnexion.");
        return forceLogout();
    }

    isRefreshing = true; // ✅ Empêche plusieurs appels simultanés
    refreshAttemptCount++;

    const refreshToken = await getStoredRefreshToken(); // 🔧 Utiliser un getter spécifique
    if (!refreshToken) {
        console.warn("❌ Aucun refresh token valide.");
        isRefreshing = false;
        return forceLogout();
    }

    try {
        const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec?route=refresh&refreshToken=${refreshToken}`);
        const data = await response.json();

        if (!data.jwt) throw new Error("❌ Refresh token invalide.");

        await setToken(data.jwt);
        console.log("✅ Token rafraîchi !");
        refreshAttemptCount = 0;
        isRefreshing = false; // ✅ Reset le flag
        return data.jwt;
    } catch (error) {
        console.error("❌ Échec du refresh :", error);
        isRefreshing = false;
        return forceLogout();
    }
}
// ✅ Ajoute cette fonction en haut, avant refreshToken()
async function getStoredRefreshToken(): Promise<string | null> {
    try {
        const db = await getDB();
        const tx = db.transaction("authStore", "readonly");
        const store = tx.objectStore("authStore");
        const refreshToken = await store.get("refreshToken");

        if (!refreshToken || typeof refreshToken !== "string") {
            console.warn("⚠️ Aucun refresh token valide trouvé.");
            return null;
        }

        return refreshToken;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du refresh token :", error);
        return null;
    }
}


// 🛠️ Vérifie si un JWT est expiré
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
}

// 🛠️ Déconnecte l'utilisateur
function forceLogout(): null {
    console.warn("🔄 Redirection vers login...");
    router.replace("/login");
    return null;
}

// 🛠️ Extrait les infos utilisateur du JWT
export function getUserInfoFromJWT(): { email: string; prenom: string; role: string; abonnement: string } {
    let jwt = sessionStorage.getItem("jwt") || 
              localStorage.getItem("jwt") || 
              document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];

    if (!jwt) {
        console.warn("⚠️ Aucun JWT trouvé !");
        return { email: "", prenom: "", role: "", abonnement: "" }; // ⚠️ Remplacement de `null` par `""`
    }

    try {
        const decoded: any = jwtDecode(jwt);
        return {
            email: decoded.email || "",
            prenom: decoded.prenom || decoded.name || "",
            role: decoded.role || "",
            abonnement: decoded.abonnement || ""
        };
    } catch (error) {
        console.error("❌ Erreur lors du décodage du JWT :", error);
        return { email: "", prenom: "", role: "", abonnement: "" }; // ⚠️ Retourne toujours des `string`
    }
}

// 🛠️ Ouvre la base IndexedDB
async function getDB() {
    return openDB("AuthDB", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("authStore")) {
                db.createObjectStore("authStore");
            }
        }
    });
}

// 🛠️ Sauvegarde JWT & Refresh Token dans IndexedDB
export async function saveTokens(jwt: string, refreshToken: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.put(jwt, "jwt");
    await store.put(refreshToken, "refreshToken");

    console.log("💾 [IndexedDB] JWT & Refresh Token sauvegardés !");
}
