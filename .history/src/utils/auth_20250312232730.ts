import { getToken, setToken, getToken } from "@/utils/api";
import { openDB } from "idb"; // Utilisation de IndexedDB avec idb
import { useAuthStore } from "@/stores/authStore"; // Store Pinia
import router from "@/router";
import { jwtDecode } from "jwt-decode";

// 🛠️ Fonction pour récupérer un JWT valide
export async function getValidToken(): Promise<string | null> {
    const jwt = await getToken();

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
export function getUserInfoFromJWT(): { email: string; prenom: string; role: string; abonnement: string } {
    let jwt = sessionStorage.getItem("jwt") || 
              localStorage.getItem("jwt") || 
              document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];

    if (!jwt) {
        console.warn("⚠️ Aucun JWT trouvé !");
        return { email: "", prenom: "", role: "", abonnement: "" }; // ✅ Toujours des strings
    }

    try {
        const decoded: any = jwtDecode(jwt);
        return {
            email: decoded.email || "", // ✅ Remplace `null` par `""`
            prenom: decoded.prenom || decoded.name || "",
            role: decoded.role || "",
            abonnement: decoded.abonnement || ""
        };
    } catch (error) {
        console.error("❌ Erreur lors du décodage du JWT :", error);
        return { email: "", prenom: "", role: "", abonnement: "" }; // ✅ Toujours des valeurs valides
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
