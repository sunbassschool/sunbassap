import { getToken, setToken } from "@/utils/api";
import { openDB } from "idb"; // Utilisation de IndexedDB avec idb
import { useAuthStore } from "@/stores/authStore"; // Store Pinia
import router from "@/router";
import { jwtDecode } from "jwt-decode";

// 🛠️ Fonction pour récupérer un JWT valide
export async function getValidToken(): Promise<string | null> {
    const jwt = await getToken("jwt");
    const authStore = useAuthStore(); // 🔥 Récupération du store Pinia

    if (jwt && !isTokenExpired(jwt)) {
        console.log("✅ JWT valide trouvé !");
        authStore.setUserToken(jwt); // 🔥 Met à jour Pinia avec le token
        authStore.user = getUserInfoFromJWT(); // 🔥 Met à jour les infos utilisateur
        return jwt;
    }

    console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
    const newJwt = await refreshToken();
    
    if (newJwt) {
        authStore.setUserToken(newJwt);
        authStore.user = getUserInfoFromJWT();
    }

    return newJwt;
}


// 🛠️ Fonction pour rafraîchir le token avec un refreshToken
export async function refreshToken(): Promise<string | null> {
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    console.warn("⛔ Trop de tentatives de refresh, on arrête.");
    await handleRefreshFailure();
    return null; // Retourne null pour indiquer l'échec
  }

  console.log("🔄 Tentative de rafraîchissement du JWT...");

  let storedRefreshToken = await getRefreshTokenFromDB();
  if (!storedRefreshToken) {
    console.warn("⚠️ Aucun refresh token disponible.");
    await handleRefreshFailure();
    return null;
  }

  console.log("🔑 Refresh token envoyé à l'API :", storedRefreshToken);

  try {
    const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      console.error(`🚨 Erreur HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.status === "success" && data.data?.jwt && data.data?.refreshToken) {
      console.log("✅ Refresh réussi !");
      await updateTokens(data.data.jwt, data.data.refreshToken);
      return data.data.jwt;
    } else {
      throw new Error("Réponse API invalide");
    }
  } catch (error) {
    console.error("❌ Erreur lors du refresh :", error);
    await handleRefreshFailure();
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

// 🛠️ Redirige l'utilisateur vers la page de connexion
function forceLogout(): null {
    console.warn("🔄 Redirection vers login...");
    router.replace("/login");
    return null;
}

// 🛠️ Extrait les infos de l'utilisateur à partir du JWT
export function getUserInfoFromJWT(): { email: string | null; prenom: string | null; role: string | null; abonnement: string | null } {
    let jwt = sessionStorage.getItem("jwt") || 
              localStorage.getItem("jwt") || 
              document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];

    if (!jwt) {
        console.warn("⚠️ Aucun JWT trouvé !");
        return { email: null, prenom: null, role: null, abonnement: null };
    }

    try {
        const decoded: any = jwtDecode(jwt);
        return {
            email: decoded.email || null,
            prenom: decoded.prenom || decoded.name || null,
            role: decoded.role || null, // Ajout du rôle
            abonnement: decoded.abonnement || null // Ajout de l'abonnement
        };
    } catch (error) {
        console.error("❌ Erreur lors du décodage du JWT :", error);
        return { email: null, prenom: null, role: null, abonnement: null };
    }
}

// 🛠️ Ouvre la base IndexedDB pour stocker les tokens
async function getDB() {
    return openDB("AuthDB", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("authStore")) {
                db.createObjectStore("authStore");
            }
        }
    });
}

// 🛠️ Sauvegarde du JWT & Refresh Token dans IndexedDB
export async function saveTokens(jwt: string, refreshToken: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.put(jwt, "jwt");
    await store.put(refreshToken, "refreshToken");

    console.log("💾 [IndexedDB] JWT & Refresh Token sauvegardés !");
}
