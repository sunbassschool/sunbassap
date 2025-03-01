import axios from 'axios';
import { openDB } from "idb";
import { jwtDecode } from "jwt-decode";

const PROXY_URL = "https://cors-proxy-37yu.onrender.com/";
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbyOMJ_tBT_0xd_Xfadr9lFFlHASmMWhP1RGhwv3aq4tDZGX5w4QFNdIPmUJWmKeHVa5/exec";

let isRefreshing = false;
let refreshPromise = null;

/**
 * Récupère le token JWT stocké
 */
function getToken() {
    return localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
}
async function verifyIndexedDBSetup() {
    const db = await openDB("authDB", 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("authStore")) {
                db.createObjectStore("authStore", { keyPath: "key" });
                console.log("✅ Object store 'authStore' créé !");
            }
        }
    });

    console.log("🔍 Vérification IndexedDB : Base et Object Store présents !");
}

// Vérifier la configuration au démarrage
verifyIndexedDBSetup();

/**
 * Vérifie si le JWT est expiré
 */
function isJwtExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        console.error("❌ Erreur lors du décodage du JWT :", e);
        return true;
    }
}

/**
 * Met à jour le refresh token dans IndexedDB
 */
async function updateRefreshTokenInDB(newRefreshToken) {
    if (!newRefreshToken) {
        console.warn("⚠️ Aucun refresh token à enregistrer.");
        return;
    }

    console.log("🗄️ Tentative de mise à jour du refresh token dans IndexedDB :", newRefreshToken);

    try {
        const db = await openDB("authDB", 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("authStore")) {
                    db.createObjectStore("authStore", { keyPath: "key" });
                    console.log("✅ Object store 'authStore' créé !");
                }
            }
        });

        console.log("✅ IndexedDB ouvert avec succès !");
        
        // 🔄 Vérification après ouverture de la base
        if (!db.objectStoreNames.contains("authStore")) {
            console.error("❌ Object store 'authStore' introuvable après ouverture de la base !");
            return;
        }

        const tx = db.transaction("authStore", "readwrite");
        const store = tx.objectStore("authStore");

        await store.put({ key: "refreshToken", value: newRefreshToken });

        console.log("✅ Refresh token mis à jour dans IndexedDB !");
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de IndexedDB :", error);
    }
}

/**
 * Rafraîchit le JWT en utilisant le refresh token
 */
export async function refreshToken() {
    if (isRefreshing) return refreshPromise;

    isRefreshing = true;
    refreshPromise = new Promise(async (resolve, reject) => {
        try {
            const storedRefreshToken = localStorage.getItem("refreshjwt");
            if (!storedRefreshToken) {
                console.warn("🚨 Aucun refresh token disponible, déconnexion...");
                logout(false);
                isRefreshing = false;
                return reject(null);
            }

            console.log("🔄 Rafraîchissement du token en cours...");
            const url = `${PROXY_URL}${API_BASE_URL}?route=refresh&refreshToken=${encodeURIComponent(storedRefreshToken)}`;
            
            const response = await fetch(url, { method: "GET" });
            if (!response.ok) throw new Error("Erreur réseau ou serveur");

            const data = await response.json();
            console.log("🔍 Réponse reçue :", data);

            if (data.status === "success" && data.data.jwt) {
                const { jwt, refreshToken } = data.data;

                console.log("✅ Nouveau JWT reçu :", jwt);

                // ✅ Stocker les nouvelles valeurs
                localStorage.setItem("jwt", jwt);
                sessionStorage.setItem("jwt", jwt);

                // ✅ Stocker le refresh token dans IndexedDB s'il a changé
                if (refreshToken && refreshToken !== storedRefreshToken) {
                    console.log("🔄 Mise à jour du refresh token dans IndexedDB...");
                    localStorage.setItem("refreshjwt", refreshToken);
                    await updateRefreshTokenInDB(refreshToken);
                }

                resolve(jwt);
            } else {
                console.error("🚨 Rafraîchissement échoué :", data.message);
                logout();
                reject(null);
            }
        } catch (error) {
            console.error("❌ Erreur lors du rafraîchissement :", error);
            logout();
            reject(null);
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    });

    return refreshPromise;
}

/**
 * Vérifie le refresh token stocké dans IndexedDB
 */
async function checkRefreshTokenInDB() {
    const db = await openDB("authDB", 1);

    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");

    const refreshTokenEntry = await store.get("refreshToken");
    console.log("📦 Refresh Token dans IndexedDB :", refreshTokenEntry?.value || "❌ Absent");
}

// 🔍 Vérifier après le rafraîchissement
setTimeout(() => {
    checkRefreshTokenInDB();
}, 5000);

/**
 * Décode le JWT
 */
function decodeJWT(jwt) {
    try {
        const decoded = jwtDecode(jwt);
        console.log("🎫 JWT décodé :", decoded);

        if (decoded.prenom) {
            sessionStorage.setItem("prenom", decoded.prenom);
            console.log("📦 Prénom stocké :", decoded.prenom);
        }
        if (decoded.email) {
            sessionStorage.setItem("email", decoded.email);
            console.log("📦 Email stocké :", decoded.email);
        }
    } catch (error) {
        console.error("🚨 Erreur lors du décodage du JWT :", error);
    }
}

/**
 * Récupère les informations utilisateur
 */
async function fetchUserInfo(jwt) {
    try {
        console.log("📡 Récupération des infos utilisateur avec le JWT :", jwt);

        const response = await fetch(`${API_BASE_URL}?route=getuser&jwt=${encodeURIComponent(jwt)}`, {
            method: "GET"
        });

        const data = await response.json();
        console.log("👤 Réponse API getUserInfo :", data);

        if (data.status === "success" && data.data) {
            console.log("✅ Infos utilisateur récupérées :", data.data);

            sessionStorage.setItem("prenom", data.data.prenom || "");
            sessionStorage.setItem("email", data.data.email || "");

            console.log("📦 Prénom stocké :", sessionStorage.getItem("prenom"));
            console.log("📦 Email stocké :", sessionStorage.getItem("email"));
        } else {
            console.warn("⚠️ Impossible de récupérer les infos utilisateur :", data.message);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des infos utilisateur :", error);
    }
}

/**
 * Effectue une requête avec authentification
 */
export async function fetchWithAuth(url, method = "GET", body = null, attempt = 1) {
    let token = getToken();

    if (!token || isJwtExpired(token)) {
        console.warn("⚠️ Token expiré ou manquant. Tentative de rafraîchissement...");
        token = await refreshToken();
        if (!token) {
            console.error("🚨 Token introuvable après rafraîchissement !");
            return { error: "Session expirée, merci de vous reconnecter." };
        }
    }

    try {
        const response = await fetch(url, {
            method,
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : null,
        });
        
        if (response.status === 401 && attempt < 3) {
            console.warn(`🔄 Tentative de rafraîchissement (${attempt}/3)...`);
            const newToken = await refreshToken();
            if (newToken) return fetchWithAuth(url, method, body, attempt + 1);
            logout();
        }

        return await response.json();
    } catch (error) {
        console.error("🚨 Erreur API :", error);
        return { error: "Erreur de connexion au serveur." };
    }
}

/**
 * Déconnecte l'utilisateur
 */
export function logout(clearRefresh = true) {
    sessionStorage.clear();
    localStorage.removeItem("jwt");
    if (clearRefresh) localStorage.removeItem("refreshjwt");
    setTimeout(() => { window.location.href = "/login"; }, 500);
}

/**
 * Récupère le rôle de l'utilisateur à partir du JWT
 */
export function getUserRole() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.role || null;
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du rôle :", error);
        return null;
    }
}
