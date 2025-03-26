import { getToken, setToken, removeToken } from "@/utils/authStorage.js";
import { openDB } from "idb"; // Utilisation de IndexedDB avec idb (simplifié)
import { useAuthStore } from "@/stores/authStore"; // Import du store Pinia
import router from "@/router/index.ts";

export async function getValidToken() {
    const jwt = await getToken("jwt");
    const authStore = useAuthStore(); // Récupère le store Pinia

    if (jwt && !isTokenExpired(jwt)) {
        console.log("✅ JWT valide trouvé !");
        authStore.setUserToken(jwt); // 🔥 Met à jour Pinia avec le token
        authStore.user = getUserInfoFromJWT(); // 🔥 Met à jour les infos utilisateur
        return jwt;
    }

    console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
    const newJwt = await refreshToken();
    
    if (newJwt) {
        authStore.setUserToken(newJwt); // 🔥 Met à jour Pinia après le refresh
        authStore.user = getUserInfoFromJWT();
    }

    return newJwt;
}

let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3; // Évite une boucle infinie

async function refreshToken() {
    if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
        console.error("❌ Trop de tentatives de refresh échouées. Déconnexion forcée.");
        return forceLogout();
    }

    refreshAttemptCount++; // Incrémente le compteur

    const refreshToken = await getToken("refreshToken");
    if (!refreshToken) {
        console.warn("❌ Aucun refresh token, redirection vers login.");
        return forceLogout();
    }

    try {
        const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec?route=refresh&refreshToken=${refreshToken}`);
        const data = await response.json();

        if (!data.jwt) throw new Error("❌ Refresh token invalide.");

        await setToken("jwt", data.jwt);
        console.log("✅ Token rafraîchi !");
        refreshAttemptCount = 0; // Réinitialise le compteur
        return data.jwt;
    } catch (error) {
        console.error("Échec du refresh :", error);
        return forceLogout();
    }
}

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
}

function redirectToLogin() {
    console.warn("🔄 Redirection vers login...");
    router.replace("/login");

}
import { jwtDecode } from "jwt-decode";

export function getUserInfoFromJWT() {
    let jwt = sessionStorage.getItem("jwt") || 
              localStorage.getItem("jwt") || 
              document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];

    if (!jwt) {
        console.warn("⚠️ Aucun JWT trouvé !");
        return { email: null, prenom: null };
    }

    try {
        const decoded = jwtDecode(jwt);
        return {
            email: decoded.email || null,
            prenom: decoded.prenom || decoded.name || null // Certains JWT utilisent "name"
        };
    } catch (error) {
        console.error("❌ Erreur lors du décodage du JWT :", error);
        return { email: null, prenom: null };
    }
}
async function getDB() {
    return openDB("AuthDB", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("authStore")) {
                db.createObjectStore("authStore");
            }
        }
    });
}

// ✅ Sauvegarde du JWT & Refresh Token dans IndexedDB
export async function saveTokens(jwt, refreshToken) {
    const db = await getDB();
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.put(jwt, "jwt");
    await store.put(refreshToken, "refreshToken");

    console.log("💾 [IndexedDB] JWT & Refresh Token sauvegardés !");
}