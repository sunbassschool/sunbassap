declare global {
  interface Window {
    latestJWT?: string;
  }
}

import { openDB } from "idb";
import { jwtDecode } from "jwt-decode";

import Cookies from "js-cookie";
import { useAuthStore } from "@/stores/authStore.ts"; // Import du store Pinia
import axios from "axios";
import router from "@/router/index.ts"
let refreshInProgress: Promise<string | null> | null = null;

// Fonction pour vérifier si l'utilisateur est connecté
export function isUserLoggedIn(): boolean {
// Vérifie la présence du JWT dans localStorage ou sessionStorage
const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

// Si le JWT est trouvé, l'utilisateur est connecté
return !!jwt;
}

// Fonction pour vérifier si l'utilisateur est un administrateur
export function isUserAdmin(): boolean {
const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

if (!jwt) {
  console.warn("❌ Aucun JWT trouvé, l'utilisateur n'est pas authentifié.");
  return false; // Si aucun JWT n'est trouvé, l'utilisateur n'est pas un admin
}

try {
  // Décodage du JWT pour extraire le payload
  const decoded = JSON.parse(atob(jwt.split(".")[1]));
  
  // Vérification du rôle dans le payload
  return decoded.role === "admin"; // Retourne true si l'utilisateur est admin
} catch (error) {
  console.error("❌ Erreur lors du décodage du JWT :", error);
  return false; // Si le JWT est invalide ou malformé, on considère que l'utilisateur n'est pas admin
}
}

let refreshAttempts = 0; // Compteur de tentatives de refresh
const MAX_REFRESH_ATTEMPTS = 3; // Limite anti-boucle
let isSyncing = false; // Verrou global pour éviter les boucles infinies
// Fonction pour récupérer le token depuis localStorage, sessionStorage, IndexedDB ou cookies
export async function getToken(): Promise<string | null> {
  let tokenObj = await getJWTFromIndexedDB();  // 🔍 IndexedDB en priorité
  console.log("📌 [DEBUG] JWT brut depuis IndexedDB :", tokenObj);

  // ✅ Si IndexedDB retourne un objet, on extrait la valeur
  let token = tokenObj || null;  // ✅ Évite l'accès à `.value`


  if (!token) {
    token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");  
    console.log("📌 [DEBUG] JWT depuis localStorage/sessionStorage :", token);
  }

  if (!token) {
    const cookieToken = document.cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1];
    if (cookieToken) {
      token = cookieToken;
    }
    console.log("📌 [DEBUG] JWT depuis les cookies :", cookieToken);
  }

  console.log("🔍 [getToken] Token final retourné :", token || "Aucun JWT trouvé");

  return token || null;
}




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
export function isTokenExpired(token: string): boolean {
  try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
  } catch (e) {
      return true; // ⚠️ Si erreur, on considère le token expiré
  }
}

export async function getValidToken(): Promise<string | null> {
  let jwtData = await getToken();

  // 🧐 Vérifions si getToken() retourne un objet { key, value } au lieu du JWT brut
  console.log("📌 [DEBUG] JWT brut récupéré :", jwtData);

  // 🔧 Extraction du token si `getToken()` renvoie un objet
  const jwt = jwtData?.value ?? jwtData;

  // 🔍 Ajoutons un log avant la vérification d'expiration
  console.log("⌛ Vérification d'expiration : JWT =", jwt);
  
  if (jwt && !isTokenExpired(jwt)) {
      console.log("✅ JWT valide trouvé !");
      const authStore = useAuthStore(); // 🔥 Récupération du store Pinia

      authStore.setUserToken(jwt); 
      authStore.user = getUserInfoFromJWT(jwt); // 🔥 Correction : on passe le JWT

      return jwt;
  }

  console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
  const newJwt = await refreshToken();

  if (newJwt) {
      console.log("✅ Refresh réussi, nouveau JWT :", newJwt);
      const authStore = useAuthStore();
      authStore.setUserToken(newJwt);
      authStore.user = getUserInfoFromJWT(newJwt); // 🔥 Correction ici aussi
  } else {
      console.error("❌ Refresh échoué, JWT non récupéré !");
  }

  return newJwt;
}

export function setToken(token: string) {
  if (!token) return;

  // 🌍 Sauvegarde dans LocalStorage
  localStorage.setItem("jwt", token);

  // 🔐 Sauvegarde dans les cookies (HTTP-only si côté serveur)
  Cookies.set("jwt", token, { secure: true, sameSite: "Strict", expires: 7 });

  // 🖥️ Sauvegarde dans SessionStorage
  sessionStorage.setItem("jwt", token);

  console.log("✅ Token sauvegardé partout !");
}
// Fonction pour récupérer le JWT depuis IndexedDB
export async function getJWTFromIndexedDB(): Promise<string | null> {
  try {
    const isReady = await verifyIndexedDBSetup();
    if (!isReady) {
      console.warn("⚠️ IndexedDB n'est pas disponible, fallback aux cookies.");
      return Cookies.get("jwt") || null;
    }

    const db = await openDB("AuthDB", 1);
    const jwt = await db.get("authStore", "jwt");

    return jwt || Cookies.get("jwt") || null; // Fallback aux cookies
  } catch (error) {
    console.error("❌ Erreur lors de l'accès à IndexedDB pour récupérer le JWT :", error);
    return Cookies.get("jwt") || null; // Fallback aux cookies
  }
}
export async function storeUserInfo(userData: { prenom: string; email: string }) {
  if (!userData?.prenom || !userData?.email) {
    console.warn("⚠️ Informations utilisateur incomplètes, stockage annulé.");
    return;
  }

  console.log("💾 Stockage des infos utilisateur...");

  // Stockage dans localStorage et sessionStorage pour un accès rapide
  localStorage.setItem("prenom", userData.prenom);
  sessionStorage.setItem("prenom", userData.prenom);
  localStorage.setItem("email", userData.email);
  sessionStorage.setItem("email", userData.email);

  // Stockage dans IndexedDB
  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.put({ key: "prenom", value: userData.prenom });
    await store.put({ key: "email", value: userData.email });

    console.log("✅ Infos utilisateur enregistrées dans IndexedDB.");
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement des infos utilisateur :", error);
  }
}
export async function restoreUserInfo() {
  console.log("🔄 Restauration des infos utilisateur...");

  // Vérifier si les données existent déjà
  const prenomExists = localStorage.getItem("prenom") || sessionStorage.getItem("prenom");
  const emailExists = localStorage.getItem("email") || sessionStorage.getItem("email");

  if (prenomExists && emailExists) {
    console.log("✅ Infos utilisateur déjà présentes, aucune restauration nécessaire.");
    return;
  }

  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");

    const prenomData = await store.get("prenom");
    const emailData = await store.get("email");

    if (prenomData?.value) {
      localStorage.setItem("prenom", prenomData.value);
      sessionStorage.setItem("prenom", prenomData.value);
    }

    if (emailData?.value) {
      localStorage.setItem("email", emailData.value);
      sessionStorage.setItem("email", emailData.value);
    }

    console.log("✅ Infos utilisateur restaurées !");
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des infos utilisateur :", error);
  }
}

// Vérifie et rafraîchit le JWT au réveil de l'application (quand l'application revient en premier plan)
export async function checkAndRefreshOnWakeUp() {
  console.log("⏰ Vérification du refresh au réveil...");

  const now = Date.now();
  const lastRefresh = Number(localStorage.getItem("lastRefreshTime")) || 0;

  if (now - lastRefresh < 5 * 60 * 1000) {
    console.log("🛑 Refresh déjà fait récemment, on attend.");
    return;
  }

  console.log("🔍 Vérification de IndexedDB avant de restaurer les tokens...");
  const isDBReady = await verifyIndexedDBSetup();
  if (!isDBReady) {
    console.warn("⚠️ IndexedDB non disponible, pas de restauration possible.");
    return;
  }

  console.log("🛠️ Restauration des tokens depuis IndexedDB...");
  await restoreTokensToIndexedDB();

  const storedRefreshToken = await getRefreshTokenFromDB();
if (!storedRefreshToken) {
    console.warn("❌ Aucun refresh token valide trouvé.");
    return;
}

const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
if (jwt && !isJwtExpired(jwt)) {  // ✅ Vérification si le JWT est toujours valide
    console.log("✅ JWT encore valide, pas besoin de refresh.");
    return;
}

console.log("🔄 JWT expiré, on tente un refresh...");
const newJwt = await refreshToken();

  if (newJwt) {
    localStorage.setItem("lastRefreshTime", now.toString());
    console.log("✅ JWT rafraîchi avec succès !");
  } else {
    console.warn("❌ Échec du refresh token.");
  }
}


export function shouldRefreshJwt(jwt: any): boolean {
  if (jwt && typeof jwt === "object" && "value" in jwt) {
    jwt = jwt.value; // 🔥 Extraire la vraie valeur si c'est un objet
  }

  if (typeof jwt !== "string" || !jwt.includes(".")) {
    console.error("🚨 JWT invalide ou manquant :", jwt);
    return false;
  }

  try {
    const tokenData = JSON.parse(atob(jwt.split(".")[1])); // Décoder le JWT
    const exp = tokenData.exp * 1000; // Convertir en millisecondes
    const now = Date.now();

    return exp - now < 5 * 60 * 1000; // 🔥 Rafraîchir si < 5 min avant expiration
  } catch (error) {
    console.error("❌ Erreur lors du décodage du JWT :", error);
    return false;
  }
}



// Fonction pour obtenir le rôle de l'utilisateur à partir du JWT
export function getUserRole(): string | null {
const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

if (!token) {
  console.warn("❌ Aucun JWT trouvé, l'utilisateur n'est pas authentifié.");
  return null; // Si aucun JWT n'est trouvé, l'utilisateur n'est pas authentifié
}

try {
  // Décodage du JWT pour extraire le payload
  const decoded = JSON.parse(atob(token.split(".")[1]));
  
  // Retourne le rôle de l'utilisateur, ou null s'il n'existe pas
  return decoded.role || null; 
} catch (error) {
  console.error("❌ Erreur lors du décodage du JWT :", error);
  return null; // Si le JWT est malformé, retourne null
}
}


// Fonction pour restaurer les tokens dans IndexedDB


export async function restoreTokensToIndexedDB() {
  console.log("🔄 Vérification et restauration des tokens...");

  const indexedDBAvailable = await verifyIndexedDBSetup();
  if (!indexedDBAvailable) {
    console.warn("❌ Impossible d'utiliser IndexedDB.");
    return;
  }

  // 🔍 Vérification des tokens dans localStorage, sessionStorage et cookies
  let storedJwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // ✅ Vérification des cookies en fallback
  if (!storedJwt) {
    storedJwt = document.cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1] || null;
    if (storedJwt) console.log("🍪 JWT restauré depuis les cookies !");
  }

  if (!storedRefreshToken) {
    storedRefreshToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1] || null;
    if (storedRefreshToken) console.log("🍪 Refresh Token restauré depuis les cookies !");
  }

  // ❌ Si aucun token n'est disponible, on arrête
  if (!storedJwt || !storedRefreshToken) {
    console.warn("⚠️ Impossible de restaurer IndexedDB : tokens manquants.");
    return;
  }

  console.log("📥 Restauration des tokens dans IndexedDB et autres stockages...");

  // ✅ Stockage dans IndexedDB
  await updateJWTInIndexedDB(storedJwt);
  await updateRefreshTokenInDB(storedRefreshToken);

  // ✅ Stockage dans localStorage et sessionStorage
  localStorage.setItem("jwt", storedJwt);
  sessionStorage.setItem("jwt", storedJwt);
  localStorage.setItem("refreshToken", storedRefreshToken);
  sessionStorage.setItem("refreshToken", storedRefreshToken);

  // ✅ Mise à jour du store Pinia
  const authStore = useAuthStore();
  authStore.setUserToken(storedJwt); // Met à jour l'état global du token
  authStore.setRefreshToken(storedRefreshToken);
  await authStore.fetchUserData(); // 🔥 Recharge les infos utilisateur si besoin

  console.log("✅ IndexedDB, localStorage, sessionStorage et Pinia mis à jour !");
}


// Fonction pour définir les cookies pour le JWT et le refreshToken
export function setTokenCookies(jwt: string | undefined, refreshToken: string | undefined) {
  if (refreshToken) {
    const maxAge = 30 * 24 * 60 * 60; // 30 jours

    // 🔥 iOS PWA bloque "SameSite=Strict", on le met à "None"
    if (jwt) {
      document.cookie = `jwt=${jwt}; Max-Age=${maxAge}; Secure; SameSite=None; path=/`;
      console.log("✅ Cookie JWT défini avec expiration longue !");
    }

    document.cookie = `refreshToken=${refreshToken}; Max-Age=${maxAge}; Secure; SameSite=None; path=/`;

    console.log("✅ Cookie Refresh Token défini avec expiration longue !");
  } else {
    console.warn("❌ Le refreshToken est undefined ou null, cookie non créé.");
  }
}





// Fonction pour vérifier si le JWT a expiré
export function isJwtExpired(token: string | { key: string; value: string } | null): boolean {
  if (!token) return true;

  // ✅ Si le token est un objet, on récupère la valeur
  if (typeof token === "object" && token.value) {
    token = token.value;
  }

  if (typeof token !== "string" || !token.includes(".") || token.split(".").length !== 3) {
    console.warn("⚠️ [isJwtExpired] Token malformé ou non-JWT détecté :", token);
    return true;
  }

  try {
    console.log("🔍 [isJwtExpired] Décodage du token...");
    const payloadBase64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(payloadBase64));

    return decodedPayload.exp * 1000 < Date.now();
  } catch (error) {
    console.error("❌ [isJwtExpired] Erreur lors du décodage du JWT :", error);
    return true;
  }
}



// ✅ Fonction de décodage Base64 robuste
function decodeBase64(str: string): string {
  try {
    return atob(str);
  } catch (error) {
    console.error("❌ Erreur lors du décodage Base64 :", error);
    return "";
  }
}



// Vérifie et restaure les tokens depuis les différents stockages
export async function checkAndRestoreTokens(): Promise<boolean> {
  console.log("🔄 Vérification des tokens...");

  if (localStorage.getItem("session_expired") === "true") {
    console.warn("🚨 La session a expiré, mais on vérifie si un JWT valide est encore en IndexedDB...");

    // 🔍 Vérifier si un JWT valide existe encore en IndexedDB
    const jwtFromDB = await getToken();
    if (jwtFromDB && !isJwtExpired(jwtFromDB)) {
      console.log("✅ JWT encore valide en IndexedDB, réactivation de la session !");
      localStorage.removeItem("session_expired"); // 🔥 On reset cette valeur
      return true;
    }

    console.warn("⛔ Aucun JWT valide trouvé, on force la reconnexion.");
    return false;
  }

  // ✅ Unification de la récupération du refreshToken
  let storedRefreshToken = 
    sessionStorage.getItem("refreshToken") || 
    localStorage.getItem("refreshToken") || 
    await getRefreshTokenFromDB();

  // 🔍 Vérifier si on a un refreshToken valide
  if (!storedRefreshToken) {
    console.warn("⚠️ Aucun refreshToken trouvé, vérification du JWT...");

    let jwt = await getToken();
    if (jwt && !isJwtExpired(jwt)) {
      console.log("✅ JWT encore valide, pas de déconnexion forcée.");
      return true; // ✅ On ne déconnecte pas
    }

    console.warn("❌ JWT expiré et aucun refreshToken disponible, l'utilisateur doit se reconnecter.");
    await logoutUser();
    return false;
  }

  // ✅ Mise à jour des cookies (évite d’avoir un cookie expiré)
  document.cookie = `refreshToken=${storedRefreshToken}; Secure; SameSite=None; path=/`;

  // ✅ Synchronisation du refreshToken dans tous les stockages
  if (!sessionStorage.getItem("refreshToken")) {
    sessionStorage.setItem("refreshToken", storedRefreshToken);
  }
  if (!localStorage.getItem("refreshToken")) {
    localStorage.setItem("refreshToken", storedRefreshToken);
  }
  await updateRefreshTokenInDB(storedRefreshToken); // ✅ Mise à jour IndexedDB

  console.log("✅ Refresh token synchronisé partout.");

  // ✅ Vérification du JWT
  let jwt = await getToken();
  if (!jwt || isJwtExpired(jwt)) {
    console.warn("🚨 JWT manquant ou expiré, tentative de rafraîchissement...");

    const newJwt = await refreshToken();
    if (!newJwt) {
      console.error("❌ Impossible de restaurer le JWT, l'utilisateur devra se reconnecter.");
      return false;
    }

    console.log("✅ Nouveau JWT restauré avec succès.");
    return true;
  }

  console.log("✅ JWT valide, aucun rafraîchissement nécessaire.");
  return true;
}




// Fonction centralisée pour interagir avec les différents stockages (localStorage, sessionStorage, cookies, IndexedDB)
const storageManager = {
  async getTokenFromAllStorages(key: string): Promise<string | null> {
    const storedToken = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (storedToken) return storedToken;

    const dbToken = await getJWTFromIndexedDB();  // À définir plus tard
    if (dbToken) return dbToken;

    const cookieToken = document.cookie.split("; ").find(row => row.startsWith(`${key}=`))?.split("=")[1];
    return cookieToken || null;
  },

  setTokenInAllStorages(key: string, token: string) {
    sessionStorage.setItem(key, token);
    localStorage.setItem(key, token);
    document.cookie = `${key}=${token}; Secure; SameSite=Strict; path=/`;
    console.log(`📦 Token "${key}" mis à jour dans tous les stockages`);
  },

  removeTokenFromAllStorages(key: string) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    console.log(`🗑️ Token "${key}" supprimé de tous les stockages`);
  }
};

export async function getRefreshTokenFromDB(): Promise<string | null> {
  console.log("🔄 Récupération du refresh token depuis IndexedDB...");

  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const result = await store.get("refreshToken");

    console.log("🔍 Refresh token récupéré :", result);

    return result?.value || null;
  } catch (error) {
    console.error("❌ Erreur lors de l'accès à IndexedDB :", error);
    return null;
  }
}




// Vérifie si IndexedDB est disponible et configurée
export async function verifyIndexedDBSetup(): Promise<boolean> {
if (!window.indexedDB) {
  console.error("❌ IndexedDB n'est pas supporté par ce navigateur !");
  return false; // Si IndexedDB n'est pas supporté, retourne false
}

try {
  // Essayer d'ouvrir ou de créer la base de données IndexedDB
  const db = await openDB("AuthDB", 1, {
    upgrade(db) {
      // Si l'object store "authStore" n'existe pas, on le crée
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ Object store 'authStore' créé dans IndexedDB !");
      }
    }
  });

  console.log("🔍 IndexedDB vérifiée et prête !");
  return true; // Si tout est ok, retourne true
} catch (error) {
  console.error("❌ Erreur lors de la vérification de IndexedDB :", error);
  return false; // En cas d'erreur, retourne false
}
}

// Fonction pour protéger IndexedDB contre un nettoyage automatique
let indexedDBCleanupRunning = false; // 🔥 Vérifie si la fonction tourne déjà

export async function preventIndexedDBCleanup() {
  if (indexedDBCleanupRunning) return; // 🚀 Évite plusieurs instances simultanées
  indexedDBCleanupRunning = true;

  console.log("🛡️ Protection contre la suppression d'IndexedDB...");

  try {
    // Ouverture de la base de données IndexedDB
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    // Inscription d'une clé spéciale pour maintenir IndexedDB en vie
    await store.put({ key: "keepAlive", value: Date.now() });

    console.log("✅ IndexedDB maintenu en vie.");
  } catch (error) {
    console.warn("⚠️ Impossible de protéger IndexedDB :", error);
  }

  // 🔄 Relance la fonction toutes les 24h
  setTimeout(() => {
    indexedDBCleanupRunning = false;
    preventIndexedDBCleanup();
  }, 24 * 60 * 60 * 1000);
}

let isRefreshing = false; // 🔥 Protection contre plusieurs refresh simultanés


export async function refreshToken(): Promise<string | null> {
  if (isRefreshing) {
    console.log("⏳ Un rafraîchissement est déjà en cours, on attend...");
    return await isRefreshing; // ⏳ On attend la fin du premier refresh
  }

  console.log("🔒 Activation du verrou de rafraîchissement...");
  let resolvePromise: (value: string | null) => void;
  isRefreshing = new Promise((resolve) => (resolvePromise = resolve)); // 🔥 Stocke la promesse pour attendre
  
  try {
    console.log("🔄 Tentative de rafraîchissement du JWT...");
    let storedRefreshToken =
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken") ||
      await getRefreshTokenFromDB();

    if (!storedRefreshToken) {
      console.warn("⚠️ Aucun refresh token disponible.");
      await handleRefreshFailure();
      resolvePromise(null); // 🔓 Libère le verrou
      isRefreshing = false;
      return null;
    }

    console.log("🔑 Refresh token envoyé à l'API :", storedRefreshToken);
    const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.status === "success" && data.data?.jwt && data.data?.refreshToken) {
      console.log("✅ Refresh réussi !");
      await updateTokens(data.data.jwt, data.data.refreshToken);
      resolvePromise(data.data.jwt); // ✅ Informe les autres appels que le refresh est terminé
      isRefreshing = false;
      return data.data.jwt;
    } else {
      throw new Error("Réponse API invalide");
    }
  } catch (error) {
    console.error("❌ Erreur lors du refresh :", error);
    await handleRefreshFailure();
    resolvePromise(null); // 🔓 Libère le verrou
    isRefreshing = false;
    return null;
  }
}

// Fonction pour mettre à jour les tokens dans tous les stockages
// Fonction pour mettre à jour les tokens dans tous les stockages
export async function updateTokens(newJwt: string | null, newRefreshToken: string | null) {
  if (!newJwt || !newRefreshToken) {
    console.warn("❌ Token manquant, mise à jour impossible.");
    return;
  }

  console.log("🔄 Mise à jour des tokens...");

  try {
    // ✅ Comparaison avec l'ancien refreshToken pour détecter les incohérences
    const oldRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
    if (oldRefreshToken && oldRefreshToken !== newRefreshToken) {
      console.warn("⚠️ Différence détectée dans les refresh tokens ! Mise à jour forcée...");
    }

    // ✅ Stockage dans localStorage et sessionStorage
    localStorage.setItem("jwt", newJwt);
    sessionStorage.setItem("jwt", newJwt);
    localStorage.setItem("refreshToken", newRefreshToken);
    sessionStorage.setItem("refreshToken", newRefreshToken);

    console.log("📦 Tokens mis à jour en localStorage et sessionStorage.");

    // ✅ Stockage dans les cookies (attention, pas HttpOnly)
    document.cookie = `jwt=${newJwt}; Secure; SameSite=None; path=/`;
    document.cookie = `refreshToken=${newRefreshToken}; Secure; SameSite=None; path=/`;

    console.log("🍪 JWT et Refresh Token mis à jour dans les cookies.");

    // ✅ Mise à jour dans IndexedDB
    await updateJWTInIndexedDB(newJwt);
    await updateRefreshTokenInDB(newRefreshToken);

    console.log("✅ Tokens mis à jour partout (LocalStorage, SessionStorage, IndexedDB, Cookie) !");
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des tokens :", error);
  }
}





// ✅ Mise à jour du refreshToken dans IndexedDB
export async function updateRefreshTokenInDB(newRefreshToken: string | null) {
  if (!newRefreshToken) return;

  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
    await store.put({ key: "refreshToken", value: newRefreshToken });

    console.log("✅ Refresh token mis à jour dans IndexedDB :", newRefreshToken);
  } catch (err) {
    console.warn("⚠️ Erreur lors de l'enregistrement du refreshToken dans IndexedDB :", err);
  }
}


// ✅ Mise à jour du JWT dans IndexedDB
export async function updateJWTInIndexedDB(newJwt: string | null) {
  if (!newJwt) return;

  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
    await store.put({ key: "jwt", value: newJwt });

    console.log("✅ JWT mis à jour dans IndexedDB :", newJwt);
  } catch (err) {
    console.warn("⚠️ Erreur lors de l'enregistrement du JWT dans IndexedDB :", err);
  }
}

// ✅ Mise à jour du refreshToken dans IndexedDB



// Mise à jour du refresh token dans IndexedDB



// Fonction pour gérer l’échec de rafraîchissement du token




export async function handleRefreshFailure() {
  console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");

  // ✅ Utiliser un système de notification au lieu d'alert()
  showNotification("Votre session a expiré. Veuillez vous reconnecter.", "error");

  // ✅ Déconnexion de l'utilisateur
  if (typeof logoutUser === "function") {
    await logoutUser(); // 🔥 Vérifier si logoutUser() est bien async
  } else {
    console.warn("⚠️ logoutUser() n'est pas défini !");
  }

  // ✅ Redirection automatique vers la page de connexion
  router.replace("/login");

  return Promise.reject("Déconnexion forcée, veuillez vous reconnecter.");
}

// ✅ Fonction de notification UX-friendly
function showNotification(message: string, type: "success" | "error") {
  // Remplace ceci par un vrai système de notification (Toast, Snackbar...)
  console.log(`[${type.toUpperCase()}] ${message}`);
}


// Nettoyage complet des données utilisateur
export async function clearUserData() {
  console.log("🧹 Nettoyage complet des données utilisateur...");

  // Supprimer toutes les données utilisateur dans localStorage
  Object.keys(localStorage).forEach(key => {
    if (
      key.startsWith("jwt") || 
      key.startsWith("refreshToken") || 
      key.startsWith("prenom") || 
      key.startsWith("userData_")
    ) {
      localStorage.removeItem(key);
      console.log(`🗑️ Clé supprimée : ${key}`);
    }
  });

  // Supprime toutes les données de sessionStorage
  try {
    sessionStorage.clear();
    console.log("🗑️ sessionStorage vidé !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de sessionStorage :", error);
  }

  // Suppression ciblée dans IndexedDB
  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.delete("jwt");
    await store.delete("refreshToken");

    console.log("✅ JWT et refreshToken supprimés de IndexedDB !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de IndexedDB :", error);
  }
}
// Vérifie et rafraîchit le JWT si nécessaire
export async function syncRefreshToken() {
  if (isSyncing) {
    console.log("🔄 Sync déjà en cours, on attend...");
    return;
  }

  isSyncing = true;

  try {
    let storedRefreshToken =
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken") ||
      await getRefreshTokenFromDB();

    if (!storedRefreshToken) {
      console.warn("⚠️ Aucun refresh token trouvé ! Tentative de récupération via JWT...");

      let jwt = await getToken(); // 🔥 Récupération du JWT
      if (jwt && !isJwtExpired(jwt)) {
        console.log("✅ JWT encore valide, tentative de récupération du refreshToken depuis l'API...");

        const newRefreshToken = await fetchNewRefreshToken(jwt); // 🔥 Nouvelle fonction API
        if (newRefreshToken) {
          console.log("✅ Refresh token récupéré avec succès !");
          await updateTokens(jwt, newRefreshToken); // 🔥 Stocker les tokens mis à jour
          isSyncing = false;
          return;
        }
      }

      console.error("❌ Aucun JWT valide et aucun refreshToken trouvé, l'utilisateur doit se reconnecter.");
      await logoutUser();
      isSyncing = false;
      return;
    }

    console.log("✅ Synchronisation terminée !");
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation du refresh token :", error);
  } finally {
    isSyncing = false;
  }
}
async function fetchNewRefreshToken(jwt: string): Promise<string | null> {
  try {
    const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec?route=getRefreshToken&jwt=${encodeURIComponent(jwt)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.status === "success" && data.refreshToken) {
      console.log("🔄 Refresh token récupéré depuis l'API :", data.refreshToken);
      return data.refreshToken;
    }

    console.warn("⚠️ Impossible de récupérer le refreshToken depuis l'API.");
    return null;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du refresh token :", error);
    return null;
  }
}

export async function getRefreshTokenExpirationFromDB(): Promise<number> {
try {
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readonly");
  const store = tx.objectStore("authStore");
  const expirationEntry = await store.get("refreshTokenExpiration");
  return expirationEntry?.value || 0;
} catch (err) {
  console.warn("⚠️ Erreur lors de la récupération de l'expiration du refresh token depuis IndexedDB :", err);
  return 0;
}
}

export async function clearIndexedDBData() {
  if (!window.indexedDB) {
    console.warn("⚠️ IndexedDB non supporté sur ce navigateur.");
    return;
  }

  try {
    const db = await openDB("AuthDB", 1);

    // Vérifie si le store "authStore" existe
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("⚠️ IndexedDB 'authStore' introuvable, aucune donnée à nettoyer.");
      return;
    }

    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.clear(); // Efface toutes les données dans le store
    await tx.done; // 🔥 Assure la fermeture propre de la transaction

    console.log("✅ IndexedDB nettoyée !");
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage de IndexedDB :", error);
  }
}


export async function syncRefreshToken() {
  if (isSyncing) {
    console.log("🔄 Sync déjà en cours, on attend...");
    return;
  }

  isSyncing = true;

  try {
    let dbToken = await getRefreshTokenFromDB();
    let localToken = localStorage.getItem("refreshToken");
    let cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("refreshToken="))
      ?.split("=")[1];

    // ✅ Extraction si IndexedDB retourne un objet
    if (dbToken && typeof dbToken === "object" && dbToken.value) {
      dbToken = dbToken.value;
    }

    if (!dbToken && !localToken && !cookieToken) {
      console.warn("⚠️ Aucun refresh token trouvé ! Tentative de récupération via JWT...");
      
      // ✅ Tentative de refresh avec le JWT stocké
      let jwt = await getToken();
      if (jwt) {
        console.log("🔄 Tentative de refresh à partir du JWT...");
        const newJwt = await refreshToken();
        if (newJwt) {
          console.log("✅ Refresh réussi, récupération complète des tokens !");
          return;
        }
      }

      console.error("🚨 Aucun refresh token valide, reset obligatoire !");
      return;
    }
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation du refresh token :", error);
  } finally {
    isSyncing = false;
  }
}





export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  try {
    // ✅ Bloquer tout refresh en cours
    if (typeof refreshInProgress !== "undefined" && refreshInProgress) {
      refreshInProgress = Promise.resolve(null);
    }

    // ✅ Marquer la session comme expirée
    localStorage.setItem("session_expired", "true");

    // ✅ Affichage du message de déconnexion stylisé
    showLogoutMessage();

    // 🗑️ **Suppression ciblée des tokens**
    console.log("🗑️ Suppression des tokens...");
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refreshTokenExpiration");

    // 🗑️ **Suppression propre des cookies**
    deleteAllCookies();

    // 🗑️ **Nettoyage IndexedDB**
    console.log("🗑️ Nettoyage de IndexedDB...");
    await clearIndexedDBData();
    console.log("✅ IndexedDB nettoyée !");

    // 🔔 Informer l'application que l'utilisateur est déconnecté
    window.dispatchEvent(new Event("logout"));

    // ✅ **Redirection après nettoyage**
    setTimeout(() => {
      console.log("🔄 Redirection vers la page de connexion...");
      router.replace("/intro"); // 🔥 Redirection sans recharger la page
    }, 2500);

    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
    return false;
  }
}

// ✅ Affichage stylisé du message de déconnexion
function showLogoutMessage() {
  const logoutMessage = document.createElement("div");
  logoutMessage.innerHTML = `
    <div class="logout-container">
      <div class="logout-spinner"></div>
      <p class="logout-text">Déconnexion en cours...</p>
    </div>
  `;

  const style = document.createElement("style");
  style.innerHTML = `
    .logout-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 18px;
      font-weight: bold;
      border-radius: 8px;
      display: flex;
      align-items: center;
      flex-direction: column;
      z-index: 9999;
      text-align: center;
      animation: fadeIn 0.3s ease-in-out;
    }
    .logout-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #ffffff;
      border-top: 4px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }
    .logout-text {
      margin: 0;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(logoutMessage);
}

// ✅ Suppression propre des cookies
function deleteAllCookies() {
  console.log("🗑️ Suppression des cookies...");
  document.cookie.split(";").forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim();
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
  });
}




// Fonction pour nettoyer les anciennes clés de refresh token et synchroniser les différents stockages
export async function fixRefreshTokenStorage() {
  console.trace("📌 Appel de fixRefreshTokenStorage"); // Affiche la trace d'appel pour débogage
  console.warn("🚨 Nettoyage des anciennes clés de refresh token ('refreshjwt')...");

  // 📌 Vérification si un `refreshjwt` existe encore
  const oldRefreshToken = localStorage.getItem("refreshjwt");
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");
  const oldRefreshTokenDB = await store.get("refreshjwt");

  if (oldRefreshToken || oldRefreshTokenDB?.value) {
    console.log("⚠️ Ancien refresh token détecté !");
    
    // 🛑 Vérifier si le refreshToken principal est déjà défini
    let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    if (!storedRefreshToken) {
      // 🔄 Si aucun refreshToken principal, on transfère `refreshjwt`
      storedRefreshToken = oldRefreshToken || oldRefreshTokenDB?.value;
      localStorage.setItem("refreshToken", storedRefreshToken);
      sessionStorage.setItem("refreshToken", storedRefreshToken);
      console.log("✅ L'ancien refresh token a été transféré !");
    }
  }

  // 🚀 Suppression des anciennes clés inutilisées
  await store.delete("refreshjwt");
  localStorage.removeItem("refreshjwt");

  console.log("✅ `refreshjwt` supprimé de IndexedDB et localStorage !");

  // ✅ Mise à jour du refreshToken en IndexedDB
  const finalRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
  if (finalRefreshToken) {
    await updateRefreshTokenInDB(finalRefreshToken);
    console.log("✅ Refresh token synchronisé dans IndexedDB !");
  }
}

// Fonction pour restaurer la session de l'utilisateur (récupère les tokens et les restaure dans les stockages)
export async function restoreSession() {
console.log("🔄 Restauration de session...");

// Vérifie si les tokens sont présents dans localStorage ou sessionStorage
const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

if (!jwt || !refreshToken) {
  console.warn("❌ Tokens manquants. L'utilisateur doit se reconnecter.");
  return false; // Retourne false si aucun token n'est trouvé
}

// Si les tokens sont trouvés, on les restaure dans IndexedDB
const indexedDBAvailable = await verifyIndexedDBSetup();  // Vérifie si IndexedDB est prête
if (!indexedDBAvailable) {
  console.warn("❌ Impossible d'utiliser IndexedDB pour restaurer les tokens.");
  return false; // Si IndexedDB n'est pas disponible, on retourne false
}

try {
  // Restaure le JWT et le refreshToken dans IndexedDB
  await updateJWTInIndexedDB(jwt);
  await updateRefreshTokenInDB(refreshToken);

  console.log("✅ Session restaurée avec succès !");
  return true; // Retourne true si la session est correctement restaurée
} catch (error) {
  console.error("❌ Erreur lors de la restauration de la session :", error);
  return false; // Retourne false en cas d'erreur
}
}
// Fonction pour planifier le rafraîchissement automatique du JWT
export function scheduleJwtRefresh() {
const refreshInterval = /Mobi|Android/i.test(navigator.userAgent) ? 2 * 60 * 1000 : 8 * 60 * 1000; // 2 minutes pour les mobiles, 8 minutes pour les autres

// Planifie une vérification et un rafraîchissement du JWT à intervalle régulier
setInterval(async () => {
  console.log("🔄 Vérification du JWT et du refresh token...");

  const refreshTokenExp = await getRefreshTokenExpirationFromDB();
  if (refreshTokenExp - Date.now() < 2 * 60 * 1000) {  // Si l'expiration du refreshToken approche
    console.warn("🚨 Refresh token bientôt expiré ! Tentative de récupération...");
    await restoreTokensToIndexedDB();  // Restaure les tokens dans IndexedDB si nécessaire
  }

  // Rafraîchit le JWT si nécessaire
  const newJwt = await refreshToken();
  if (!newJwt) {
    console.error("❌ Refresh échoué, déconnexion en cours...");
    await logoutUser();  // Déconnecte l'utilisateur en cas d'échec du refresh
  } else {
    console.log("✅ JWT rafraîchi avec succès !");
  }
}, refreshInterval);  // Vérifie toutes les 2 ou 8 minutes
}
