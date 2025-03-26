import { getToken, setToken, removeToken } from "@/utils/authStorage.js";

export async function getValidToken() {
    const jwt = await getToken("jwt");
    if (jwt && !isTokenExpired(jwt)) {
        console.log("✅ JWT valide trouvé !");
        return jwt;
    }

    console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
    return await refreshToken();
}

async function refreshToken() {
    const refreshToken = await getToken("refreshToken");
    if (!refreshToken) {
        console.warn("❌ Aucun refresh token, redirection vers login.");
        return redirectToLogin();
    }

    try {
        const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec?route=refresh&refreshToken=${refreshToken}`);
        const data = await response.json();

        if (!data.jwt) throw new Error("❌ Refresh token invalide.");

        await setToken("jwt", data.jwt);
        console.log("✅ Token rafraîchi !");
        return data.jwt;
    } catch (error) {
        console.error("Échec du refresh :", error);
        await removeToken("jwt");
        await removeToken("refreshToken");
        return redirectToLogin();
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

function getUserInfoFromJWT() {
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
