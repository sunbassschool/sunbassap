declare global {
  interface Window {
    latestJWT?: string;
    jwtRefreshScheduled?: boolean;
  }
}


import { openDB } from "idb";
import { jwtDecode } from "jwt-decode";
import type { UserInfo } from "@/utils/types"; // 📌 Adapte le chemin si nécessaire
import Cookies from "js-cookie";
import { getAuthDB } from '@/utils/indexedDbUtils'; // chemin selon ton projet

import axios from "axios";
import router from "@/router/index.ts"
let refreshInProgress: Promise<string | null> | null = null;
let resolvePromise: ((value: string | null) => void) | null = null;



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
// Déclare l'interface TokenObject quelque part avant de l'utiliser
export interface TokenObject {
  jwt?: string;
  [key: string]: any;
}
export async function getStoredJWT() {
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  // 🔍 Vérifier dans les cookies
  if (!jwt) {
    const cookies = document.cookie.split("; ");
    const jwtCookie = cookies.find(row => row.startsWith("jwt="));
    if (jwtCookie) jwt = jwtCookie.split("=")[1];
  }

  // 🔍 Vérifier dans IndexedDB de manière asynchrone
  if (!jwt) {
    try {
      jwt = await getJWTFromIndexedDB();
    } catch (error) {
      console.error("⚠️ Erreur lors de l'accès à IndexedDB :", error);
    }
  }

  return jwt;
}
export async function getToken(): Promise<string | null> {
  console.log("🔄 Tentative de récupération du JWT...");

  // 1. Vérification dans localStorage/sessionStorage
  let token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  if (token) {
    console.log("✅ JWT trouvé dans localStorage ou sessionStorage.");
  } else {
    console.log("🔍 Aucun JWT trouvé dans localStorage ou sessionStorage.");
  }

  // 2. Vérification dans les cookies si le token n'est pas trouvé
  if (!token) {
    console.log("🔍 Tentative de récupération du JWT depuis les cookies...");
    token = document.cookie
      .split("; ")
      .find(row => row.startsWith("jwt="))
      ?.split("=")[1] || null;

    if (token) {
      console.log("✅ JWT trouvé dans les cookies.");
    } else {
      console.log("🔍 Aucun JWT trouvé dans les cookies.");
    }
  }

  // 3. Vérification finale dans IndexedDB si aucune donnée n'est trouvée
  if (!token) {
    console.log("🔍 Tentative de récupération du JWT depuis IndexedDB...");
    const fromDb: string | null = await getJWTFromIndexedDB();


    if (fromDb && typeof fromDb === "object") {
      token = fromDb ?? null;
    } else {
      token = typeof fromDb === "string" ? fromDb : null;
    }

    if (token) {
      console.log("✅ JWT trouvé dans IndexedDB.");
    } else {
      console.log("🔍 Aucun JWT trouvé dans IndexedDB.");
    }
  }

  if (!token) {
    console.warn("⚠️ Aucun JWT trouvé après toutes les vérifications.");
  }

  return token;
}




export async function resetIndexedDB(): Promise<void> {
  if (!window.indexedDB) {
    console.error("❌ Impossible de supprimer IndexedDB : non supportée !");
    return;
  }

  try {
    console.log("🔍 Vérification de IndexedDB avant suppression...");

    const dbs: { name?: string }[] = await indexedDB.databases();
    if (!dbs.some(db => db.name === "AuthDB")) {
      console.log("ℹ️ AuthDB n'existe pas, rien à supprimer.");
      return;
    }

    console.log("🗑️ Suppression de la base AuthDB...");
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase("AuthDB");
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });

    console.log("✅ AuthDB supprimée avec succès.");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de IndexedDB :", error);
  }
}


export async function hasUserEverLoggedIn(): Promise<boolean> {
  const userInfo: UserInfo | null = await restoreUserInfo();

  if (userInfo && typeof userInfo === "object" && "email" in userInfo) {
    console.log("✅ Un utilisateur a déjà été connecté :", userInfo.email);
    return true;
  }
  console.log("🚀 Aucun utilisateur enregistré, c'est une première connexion.");
  return false;
}

// Fonction pour récupérer une valeur dans IndexedDB
export function getFromIndexedDB(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AuthDB", 1);

    request.onupgradeneeded = function (event) {
      console.warn("⚠️ IndexedDB mis à jour, vérification des stores...");
      const db = (event.target as IDBRequest<IDBDatabase >)?.result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ 'authStore' créé !");
      }
    };

    request.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBDatabase >)?.result;
      if (!db) {
        throw new Error("IndexedDB inaccessible");
      }
      const tx = db.transaction("authStore", "readwrite");
      
      if (!db.objectStoreNames.contains("authStore")) {
        reject("❌ Object store 'authStore' introuvable !");
        return;
      }

      const transaction = db.transaction("authStore", "readonly");
      const store = transaction.objectStore("authStore");
      const getRequest = store.get(key);

      getRequest.onsuccess = function () {
        resolve(getRequest.result ? getRequest.result.value : null);
      };

      getRequest.onerror = function () {
        reject("❌ Erreur lors de la récupération de la clé dans IndexedDB");
      };
    };

    request.onerror = function () {
      reject("❌ Erreur de connexion à IndexedDB");
    };
  });
}



// Fonction pour sauvegarder une valeur dans IndexedDB
export function saveToIndexedDB(key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("myDatabase", 1);

    request.onsuccess = (evt) => {
      const dbRequest = evt.target as IDBRequest<IDBDatabase >;
      if (!dbRequest) {
        reject("Erreur : impossible d’ouvrir la DB");
        return;
      }
      const db = dbRequest.result;
      if (!db) {
        throw new Error("IndexedDB inaccessible");
      }
      const tx = db.transaction("authStore", "readwrite");
      

      const transaction = db.transaction("authStore", "readwrite");
      const store = transaction.objectStore("authStore");
      const putRequest = store.put(value, key);

      putRequest.onsuccess = () => {
        resolve();
      };
      putRequest.onerror = () => {
        reject("Erreur lors de la sauvegarde dans IndexedDB");
      };
    };

    request.onerror = () => {
      reject("Erreur de connexion à IndexedDB");
    };
  });
}



export async function getPrenomFromIndexedDB(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AuthDB", 1);

    request.onerror = () => {
      console.error("❌ [getPrenomFromIndexedDB] Impossible d’ouvrir IndexedDB.");
      reject(null);
    };

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("authStore")) {
        console.warn("⚠️ [getPrenomFromIndexedDB] Store 'authStore' absent.");
        return resolve(null);
      }

      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");
      const getRequest = store.get("prenom");

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(typeof result === "object" && result?.value ? result.value : null);
      };

      getRequest.onerror = () => {
        console.error("❌ [getPrenomFromIndexedDB] Erreur lors de la récupération.");
        reject(null);
      };
    };
  });
}
// Dans api.ts
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inconnue est survenue";
}



export function getUserInfoFromJWT(jwt?: string): { email: string; prenom: string; role: string; abonnement: string } {
  // Si aucun jwt n'est passé en argument, on le récupère des stockages
  if (!jwt) {
      jwt = sessionStorage.getItem("jwt") || 
            localStorage.getItem("jwt") || 
            document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];
  }

  if (!jwt || typeof jwt !== 'string') { // Vérifie que jwt est bien une chaîne
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
  console.log("🔍 Vérification des tokens en cours...");

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide trouvé dans localStorage !");
    return jwt;
  }

  jwt = await getToken();
  console.log("📌 [DEBUG] JWT brut récupéré depuis IndexedDB :", jwt);
  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT valide trouvé dans IndexedDB !");
    return jwt;
  }

  console.warn("🚨 JWT expiré ou absent, tentative de refresh...");

  // 🛑 Nouveau : protection contre un refresh interrompu par un reload
  if (sessionStorage.getItem("refreshInProgress")) {
    console.log("🧱 Refresh détecté via sessionStorage, attente sécurisée...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // ou 1500ms
    jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    if (jwt && !isJwtExpired(jwt)) {
      console.log("✅ JWT récupéré après délai de sécurité.");
      return jwt;
    }
    console.warn("⚠️ Toujours pas de JWT après délai d'attente.");
  }

  // 🔄 Refresh propre
  if (isRefreshing) {
    console.log("⏳ Refresh déjà en cours, on attend...");
    return await isRefreshing;
  }

  try {
    sessionStorage.setItem("refreshInProgress", "true");
    isRefreshing = refreshToken(); // ✅
    const newJwt = await isRefreshing;

    if (newJwt) {
      console.log("✅ Refresh réussi, nouveau JWT obtenu.");
      localStorage.setItem("lastRefreshAt", Date.now().toString()); // facultatif
      return newJwt;
    } else {
      console.error("❌ Refresh échoué, JWT non récupéré !");
      return null;
    }
  } catch (error) {
    console.error("❌ Erreur lors du rafraîchissement du JWT :", error);
    return null;
  } finally {
    isRefreshing = null;
    sessionStorage.removeItem("refreshInProgress");
  }
}


async function waitForRefresh(timeout = 5000): Promise<string | null> {
  const start = Date.now();
  while (isRefreshing && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }

  const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  return jwt && !isJwtExpired(jwt) ? jwt : null;
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
    const db = await getAuthDB();

    
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("⚠️ 'authStore' absent, impossible de récupérer le JWT !");
      return null;
    }

    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const result = await store.get("jwt");

    console.log("🔍 JWT récupéré depuis IndexedDB :", result);

    return result?.value ?? null;
  } catch (error) {
    console.error("❌ Erreur lors de l'accès à IndexedDB :", error);
    return null;
  }
}







export async function storeUserInfo(userData: { prenom: string; email: string }) {
  if (!userData?.prenom || !userData?.email) {
    console.warn("⚠️ Informations utilisateur incomplètes, stockage annulé.");
    return;
  }

  try {
    const db = await getAuthDB();

    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    // 🔥 Vérifie si le store utilise un keyPath ou non
    const hasKeyPath = store.keyPath !== null;

    if (hasKeyPath) {
      await store.put({ key: "prenom", value: userData.prenom });
      await store.put({ key: "email", value: userData.email });
    } else {
      await store.put({ value: userData.prenom }, "prenom");
      await store.put({ value: userData.email }, "email");
    }

    console.log("✅ Infos utilisateur enregistrées dans IndexedDB.");
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement des infos utilisateur :", error);
  }
}


export async function restoreUserInfo(): Promise<UserInfo | null> {
  console.log("🔄 Restauration des infos utilisateur...");

  // Vérifier si les données existent déjà
  const prenomExists = localStorage.getItem("prenom") || sessionStorage.getItem("prenom");
  const emailExists = localStorage.getItem("email") || sessionStorage.getItem("email");

  if (prenomExists && emailExists) {
    console.log("✅ Infos utilisateur déjà présentes, aucune restauration nécessaire.");
    return null; // ✅ Ajout d'un `return null;` explicite pour éviter l'erreur
  }

  try {
    const db = await getAuthDB();

    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");

    const prenomData = await store.get("prenom");
    const emailData = await store.get("email");

    let prenom = prenomData?.value || null;
    let email = emailData?.value || null;

    if (prenom) {
      localStorage.setItem("prenom", prenom);
      sessionStorage.setItem("prenom", prenom);
    }

    if (email) {
      localStorage.setItem("email", email);
      sessionStorage.setItem("email", email);
    }

    console.log("✅ Infos utilisateur restaurées !");
    
    // ✅ Retourne un objet `UserInfo` si les données sont valides
    if (prenom && email) {
      return { prenom, email } as UserInfo;
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des infos utilisateur :", error);
  }

  return null; // ✅ Ajout d'un `return null;` explicite si aucune donnée n'est trouvée
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
    console.warn("⚠️ IndexedDB non disponible, tentative de restauration depuis localStorage...");
  }

  console.log("🛠️ Récupération des tokens depuis IndexedDB...");
  let storedRefreshToken = await getRefreshTokenFromDB();

  if (!storedRefreshToken) {
    console.warn("⚠️ Aucun refresh token dans IndexedDB, restauration depuis LocalStorage...");
    storedRefreshToken = localStorage.getItem("refreshToken");
    const storedJWT = localStorage.getItem("jwt");

    if (storedRefreshToken && storedJWT) {
      console.log("✅ Tokens trouvés dans LocalStorage, sauvegarde dans IndexedDB...");
      await saveTokensToIndexedDB(storedJWT, storedRefreshToken);
    } else {
      console.warn("❌ Aucun token valide en IndexedDB ni LocalStorage !");
      return;
    }
  }

  // Vérifier si le JWT est encore valide
  const jwt = await getJWTFromIndexedDB();
  if (jwt && !isJwtExpired(jwt)) {
    console.log("✅ JWT encore valide, pas besoin de refresh.");
    return;
  }

  console.log("🔄 JWT expiré, on tente un refresh...");
  const newJwt = await (refreshToken()); // ✅ Ajoute des parenthèses pour lever toute ambiguïté

  if (newJwt) {
    localStorage.setItem("lastRefreshTime", now.toString());
    console.log("✅ JWT rafraîchi avec succès !");
  } else {
    console.warn("❌ Échec du refresh token.");
  }
}
async function saveTokensToIndexedDB(jwt: string, refreshToken: string) {
  try {
    const db = await getAuthDB();

    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    await store.put({ key: "jwt", value: jwt });
    await store.put({ key: "refreshToken", value: refreshToken });

    console.log("✅ Tokens enregistrés dans IndexedDB !");
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement des tokens dans IndexedDB :", error);
  }
}


export function shouldRefreshJwt(jwt: string | null): boolean {
  if (!jwt || !jwt.includes(".")) {
    console.error("🚨 JWT invalide ou manquant :", jwt);
    return false;
  }

  try {
    const payload = JSON.parse(atob(jwt.split(".")[1])); // Décodage du payload
    const exp = payload.exp * 1000; // Convertir en millisecondes
    const now = Date.now();
    const bufferTime = 2 * 60 * 1000; // 🔄 Marge de 2 min avant expiration

    if (now >= exp - bufferTime) {
      console.log("🔄 Le JWT doit être rafraîchi !");
      return true;
    }

    console.log("✅ JWT encore valide.");
    return false;
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
export function deleteDB(dbName: string): void {
  const dbRequest = indexedDB.deleteDatabase(dbName);

  dbRequest.onsuccess = () => {
    console.log(`Base de données ${dbName} supprimée avec succès.`);
  };

  dbRequest.onerror = (error) => {
    console.error(`Erreur lors de la suppression de la base de données ${dbName}:`, error);
  };
}


// Fonction pour restaurer les tokens dans IndexedDB


export async function restoreTokensToIndexedDB() {
  console.log("🔄 Vérification et restauration des tokens dans IndexedDB...");

  try {
    const db = await getAuthDB();

    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    // ✅ Timeout pour éviter de rester bloqué
    const timeout = new Promise((resolve) => setTimeout(resolve, 5000, "timeout"));

    // 🔍 Vérification si les tokens existent déjà en IndexedDB
    const checkTokens = async () => {
      const jwtInDB = await store.get("jwt");
      const refreshTokenInDB = await store.get("refreshToken");
      return jwtInDB && refreshTokenInDB;
    };

    const result = await Promise.race([checkTokens(), timeout]);

    if (result === "timeout") {
      console.warn("⚠️ Temps d'attente trop long, on continue sans bloquer l’utilisateur.");
      return;
    }

    if (result) {
      console.log("✅ Tokens déjà présents en IndexedDB, pas besoin de restauration.");
      return;
    }

    // ✅ Récupération des tokens depuis d’autres stockages
    let storedJwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

    // ✅ Vérification des cookies en fallback
    if (!storedJwt) {
      storedJwt = document.cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1] || null;
      if (storedJwt) {
        storedJwt = decodeURIComponent(storedJwt);
        console.log("🍪 JWT restauré depuis les cookies !");
      }
    }

    if (!storedRefreshToken) {
      storedRefreshToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1] || null;
      if (storedRefreshToken) {
        storedRefreshToken = decodeURIComponent(storedRefreshToken);
        console.log("🍪 Refresh Token restauré depuis les cookies !");
      }
    }

    if (!storedJwt || !storedRefreshToken) {
      console.warn("⚠️ Impossible de restaurer IndexedDB : tokens manquants.");
      return;
    }

    console.log("📥 Restauration des tokens dans IndexedDB...");

    // ✅ Stockage sécurisé dans IndexedDB
    await store.put({ key: "jwt", value: storedJwt });
    await store.put({ key: "refreshToken", value: storedRefreshToken });

    console.log("✅ Tokens mis à jour dans IndexedDB !");
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des tokens dans IndexedDB :", error);
  }
}


export async function restoreTokensToIndexedDBIfMissing(): Promise<void> {
  console.log("🔄 Vérification et restauration des tokens dans IndexedDB...");

  try {
    const db = await getAuthDB();

    // Vérifie si IndexedDB contient déjà les tokens
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    
    const jwtEntry = await store.get("jwt");
    const refreshTokenEntry = await store.get("refreshToken");

    const jwtInDB = jwtEntry?.value || null;
    const refreshTokenInDB = refreshTokenEntry?.value || null;

    if (jwtInDB && refreshTokenInDB) {
      console.log("✅ IndexedDB contient déjà les tokens, aucune restauration nécessaire.");
      return;
    }

    // 🔍 Vérification dans localStorage / sessionStorage
    let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt") || null;
    let refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken") || null;

    // 🔍 Vérification dans les cookies si absent ailleurs
    if (!jwt) {
      jwt = document.cookie
        .split("; ")
        .find(row => row.startsWith("jwt="))
        ?.split("=")[1] || null;
      if (jwt) console.log("🍪 JWT restauré depuis les cookies !");
    }

    if (!refreshToken) {
      refreshToken = document.cookie
        .split("; ")
        .find(row => row.startsWith("refreshToken="))
        ?.split("=")[1] || null;
      if (refreshToken) console.log("🍪 Refresh Token restauré depuis les cookies !");
    }

    // ✅ Si on a trouvé des tokens ailleurs, on les restaure dans IndexedDB
    if (jwt && refreshToken) {
      console.log("📥 Restauration des tokens dans IndexedDB...");

      const writeTx = db.transaction("authStore", "readwrite");
      const writeStore = writeTx.objectStore("authStore");

      await writeStore.put({ key: "jwt", value: jwt });
      await writeStore.put({ key: "refreshToken", value: refreshToken });

      console.log("✅ Tokens restaurés dans IndexedDB !");
    } else {
      console.warn("⚠️ Aucun token valide trouvé pour restauration.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des tokens en IndexedDB :", error);
  }
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


export async function restoreAllTokens() {
  console.log("🔄 Tentative de restauration complète des tokens...");

  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // 🔍 Si JWT et RefreshToken sont absents, essayer les cookies
  if (!jwt) jwt = document.cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1] || null;
  if (!refreshToken) refreshToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1] || null;

  // 🔍 Si toujours rien, essayer IndexedDB
  if (!jwt) jwt = await getJWTFromIndexedDB();
  if (!refreshToken) refreshToken = await getRefreshTokenFromDB();

  if (jwt && refreshToken) {
    console.log("✅ Tokens retrouvés, synchronisation de tous les stockages...");
    syncAllStorages(jwt, refreshToken);
  } else {
    console.warn("⚠️ Aucun JWT ou Refresh Token valide trouvé !");
  }
}



// Fonction pour vérifier si le JWT a expiré
// Vérifie si le JWT est expiré ou invalide
export function isJwtExpired(token: string | { key: string; value: string } | null): boolean {
  if (!token) {
    console.warn("⚠️ [isJwtExpired] Aucun token fourni (null/undefined).");
    return true;
  }

  const jwtString = typeof token === "object" && token.value ? token.value : token;

  if (typeof jwtString !== "string" || !jwtString.includes(".") || jwtString.split(".").length !== 3) {
    console.warn("⚠️ [isJwtExpired] Token malformé ou non-JWT détecté :", jwtString);
    return true;
  }

  try {
    console.log("🔍 [isJwtExpired] Décodage du token...");

    function base64UrlDecode(str: string): string {
      str = str.replace(/-/g, "+").replace(/_/g, "/");
      while (str.length % 4) str += "=";
      return atob(str);
    }

    const decodedPayload = JSON.parse(base64UrlDecode(jwtString.split(".")[1]));

    if (typeof decodedPayload.exp !== "number") {
      console.warn("⚠️ [isJwtExpired] Champ 'exp' absent ou malformé :", decodedPayload);
      return true;
    }

    const now = Date.now();
    const leeway = 10 * 1000; // en ms
    const exp = decodedPayload.exp * 1000;

    console.log(`🕒 [isJwtExpired] Exp = ${exp} (${new Date(exp).toISOString()})`);
    console.log(`🕒 [isJwtExpired] Now = ${now} (${new Date(now).toISOString()})`);
    console.log(`⏳ [isJwtExpired] Leeway = ${leeway} ms`);

    if (exp < now + leeway) {
      console.warn("⚠️ [isJwtExpired] Token expiré avec leeway.");
      return true;
    }

    console.log("✅ [isJwtExpired] Token encore valide.");
    return false;
  } catch (error) {
    console.error("❌ [isJwtExpired] Erreur lors du décodage du JWT :", error);
    return true;
  }
}




// Fonction pour obtenir un JWT valide (en cas de token expiré ou malformé, rafraîchit avec le refresh token)






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
export async function checkAndRestoreTokens(): Promise<"valid" | "expired" | "unauthenticated"> {
  console.log("🔄 Vérification des tokens...");

  if (localStorage.getItem("session_expired") === "true") {
    console.warn("🚨 Session marquée comme expirée, arrêt de la récupération des tokens.");
    return "expired"; // 🚨 Session explicitement expirée
  }

  // ✅ Unification de la récupération du refreshToken
  let storedRefreshToken =
  localStorage.getItem("refreshToken") ||
  sessionStorage.getItem("refreshToken") ||
  await getRefreshTokenFromDB();


  if (!storedRefreshToken) {
    console.warn("⚠️ Aucun refreshToken trouvé, vérification du JWT...");

    let jwt = await getValidToken();
    if (jwt && !isJwtExpired(jwt)) {
      console.log("✅ JWT encore valide, utilisateur toujours authentifié.");
      return "valid"; // ✅ L'utilisateur est encore connecté avec un JWT valide
    }

    console.warn("❌ Aucun JWT valide trouvé, l'utilisateur n'a jamais été authentifié.");
    return "unauthenticated"; // 🚨 Aucune trace d'authentification
  }

  // ✅ Restaurer le refreshToken dans tous les stockages si absent
  if (!document.cookie.includes("refreshToken=")) {
    document.cookie = `refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/`;
    console.log("🍪 Refresh token restauré dans les cookies.");
  }
  if (!localStorage.getItem("refreshToken")) {
    localStorage.setItem("refreshToken", storedRefreshToken);
    console.log("📦 Refresh token restauré dans LocalStorage.");
  }
  if (!sessionStorage.getItem("refreshToken")) {
    sessionStorage.setItem("refreshToken", storedRefreshToken);
    console.log("📦 Refresh token restauré dans SessionStorage.");
  }

  // ✅ Vérification du JWT
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (!jwt || isJwtExpired(jwt)) {
    console.warn("🚨 JWT manquant ou expiré, tentative de rafraîchissement...");

    const newJwt = await (refreshToken()); // ✅ Ajoute des parenthèses pour lever toute ambiguïté
    if (!newJwt) {
      console.error("❌ Refresh échoué, session expirée.");
      return "expired"; // 🚨 Session expirée car le refreshToken est soit invalide, soit refusé
    }

    console.log("✅ Nouveau JWT restauré avec succès.");
    return "valid"; // ✅ Nouveau JWT valide après refresh
  }

  console.log("✅ JWT valide, aucun rafraîchissement nécessaire.");
  return "valid";
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
  console.log("🔄 Récupération du refresh token...");

  // 1. Vérification de localStorage
  let storedRefreshToken = localStorage.getItem("refreshToken")?.trim();
  
  if (storedRefreshToken) {
    console.log("✅ Refresh token trouvé dans localStorage.");
  } else {
    console.log("🔍 Aucun refresh token trouvé dans localStorage.");
  }

  if (!storedRefreshToken) {
    console.log("🔍 Aucun refresh token trouvé dans localStorage, vérification dans sessionStorage...");
    // 2. Si non trouvé, vérifie sessionStorage
    storedRefreshToken = sessionStorage.getItem("refreshToken")?.trim();

    if (storedRefreshToken) {
      console.log("✅ Refresh token trouvé dans sessionStorage.");
    } else {
      console.log("🔍 Aucun refresh token trouvé dans sessionStorage.");
    }
  }

  if (!storedRefreshToken) {
    console.log("🔍 Aucun refresh token trouvé dans localStorage ou sessionStorage, vérification dans IndexedDB...");
    // 3. Si toujours pas trouvé, vérifie IndexedDB
    try {
      const db = await getAuthDB();

      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");
      const result = await store.get("refreshToken"); // ✅ Utilisation correcte avec transaction

      storedRefreshToken = result?.value || null;
      return storedRefreshToken ?? null; // garantit un retour type `string | null`

      if (storedRefreshToken) {
        console.log("✅ Refresh token trouvé dans IndexedDB.");
      } else {
        console.log("🔍 Aucun refresh token trouvé dans IndexedDB.");
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'accès à IndexedDB :", error);
      storedRefreshToken = null;
    }
  }

  if (storedRefreshToken) {
    console.log("✅ Refresh token récupéré :", storedRefreshToken);
  } else {
    console.log("⚠️ Aucun refresh token trouvé après vérification dans tous les stockages.");
  }

  return storedRefreshToken;
}





export async function isAuthStoreReady(): Promise<boolean> {
  try {
    const db = await getAuthDB();

    return db.objectStoreNames.contains("authStore");
  } catch (error) {
    console.error("❌ Erreur lors de l'accès à IndexedDB :", error);
    return false;
  }
}


async function deleteIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase("AuthDB");

    deleteRequest.onsuccess = () => {
      console.log("✅ IndexedDB supprimée avec succès.");
      resolve();
    };

    deleteRequest.onerror = (event) => {
      console.error("❌ Erreur lors de la suppression d'IndexedDB :", event);
      reject(event);
    };
  });
}

async function restoreTokensAfterDBReset() {
  console.log("🔍 Vérification : restoreTokensAfterDBReset() appelée !");
  
  const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (!jwt && !refreshToken) {
    console.warn("⚠️ Aucun token trouvé en localStorage/sessionStorage, restauration ignorée.");
    return;
  }

  try {
    console.log("🔄 Sauvegarde des tokens dans IndexedDB...");
    const db = await openIndexedDB("AuthDB", 1);
    const transaction = db.transaction("authStore", "readwrite");
    const store = transaction.objectStore("authStore");

    if (jwt) {
      console.log("✅ JWT restauré :", jwt);
      store.put({ key: "jwt", token: jwt });
    }
    if (refreshToken) {
      console.log("✅ Refresh Token restauré :", refreshToken);
      store.put({ key: "refreshToken", token: refreshToken });
    }

    transaction.oncomplete = () => {
      console.log("✅ Transaction IndexedDB terminée !");
    };

    transaction.onerror = () => {
      console.error("❌ Erreur lors de la transaction IndexedDB !");
    };

  } catch (error) {
    console.error("❌ Échec de la restauration des tokens dans IndexedDB :", error);
  }
}




export async function verifyIndexedDBSetup(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = indexedDB.open("AuthDB", 1);

    request.onsuccess = async () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("authStore")) {
        console.warn("⚠️ 'authStore' manquant ! Suppression et recréation...");
        db.close();

        try {
          await deleteIndexedDB();
          console.log("🔄 IndexedDB supprimée, recréation en cours...");

          const isRecreated = await verifyIndexedDBSetup();

          if (isRecreated) {
            console.log("✅ IndexedDB recréée, restauration des tokens...");
            setTimeout(async () => {
              await restoreTokensAfterDBReset();
            }, 100);
          }

          resolve(isRecreated);
        } catch (error) {
          console.error("❌ Échec de la suppression de IndexedDB :", error);
          resolve(false);
        }
      } else {
        console.log("✅ IndexedDB et 'authStore' prêts.");
        resolve(true);
      }
    };

    request.onerror = () => {
      console.error("❌ Erreur lors de l'accès à IndexedDB !");
      resolve(false);
    };

    request.onupgradeneeded = (event) => {
      console.log("📌 Mise à niveau IndexedDB : création de 'authStore'...");

      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
      }
    };
  });
}








export async function getItemFromStore(storeName: string, key: string): Promise<string | null> {
  try {
    console.log(`🔍 [DEBUG] Tentative de récupération de ${key} dans ${storeName}...`);

    // ✅ Ouverture de la base sans gestion d'upgrade ici !
    const db = await openIndexedDB("AuthDB", 1);

    // 🚨 Vérification que le store existe
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`⚠️ Store ${storeName} absent. IndexedDB pourrait être corrompu.`);
      return null;
    }

    // ✅ Lecture du store
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        if (request.result) {
          console.log(`✅ [DEBUG] ${key} récupéré depuis IndexedDB :`, request.result);
          resolve(request.result.value ?? request.result);
        } else {
          console.warn(`⚠️ Clé ${key} absente dans IndexedDB.`);

          // 🔄 Vérification dans localStorage et sessionStorage
          const fallbackValue = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (fallbackValue) {
            console.log(`🔄 ${key} trouvé en stockage local, restauration dans IndexedDB...`);
            await saveItemToStore(storeName, key, fallbackValue);
            resolve(fallbackValue);
          } else {
            console.warn(`🚨 Aucun ${key} trouvé dans IndexedDB, localStorage ou sessionStorage.`);
            resolve(null);
          }
        }
      };

      request.onerror = () => {
        console.error(`❌ Erreur lors de la récupération de ${key} dans IndexedDB.`);
        resolve(null);
      };
    });
  } catch (error) {
    console.error(`❌ Erreur lors de l'accès à IndexedDB (${storeName} - ${key}) :`, error);
    return null;
  }
}

export async function saveItemToStore(storeName: string, key: string, value: string): Promise<void> {
  try {
    console.log(`💾 [DEBUG] Sauvegarde de ${key} dans IndexedDB...`);

    const db = await openIndexedDB("AuthDB", 1);

    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`⚠️ Impossible de sauvegarder ${key} : le store ${storeName} est absent.`);
      return;
    }

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ key, value });

    tx.oncomplete = () => console.log(`✅ ${key} enregistré avec succès dans IndexedDB.`);
    tx.onerror = () => console.error(`❌ Erreur lors de l'enregistrement de ${key} dans IndexedDB.`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'accès à IndexedDB pour sauvegarder ${key} :`, error);
  }
}



export function openIndexedDB(dbName: string, version: number): Promise<IDBDatabase > {
  return new Promise<IDBDatabase>((resolve, reject) => {
   const request = indexedDB.open(dbName, version);

   request.onupgradeneeded = (event) => {
     const db = request.result;
     console.log("⚡ Mise à jour d'IndexedDB, vérification des object stores...");

     if (!db.objectStoreNames.contains("authStore")) {
       console.log("🛠️ Création de l'object store 'authStore'...");
       db.createObjectStore("authStore", { keyPath: "key" }); // ✅ Très important !
     }
   };

   request.onsuccess = () => {
     console.log("✅ IndexedDB ouverte avec succès !");
     resolve(request.result);
   };

   request.onerror = () => {
     console.error("❌ Erreur d'ouverture IndexedDB :", request.error);
     reject(request.error);
   };
 });
}

export function putItemInStore(store: IDBObjectStore, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Fonction pour protéger IndexedDB contre un nettoyage automatique
let indexedDBCleanupRunning = false; // 🔥 Vérifie si la fonction tourne déjà

let isRestoringTokens = false;

export async function restoreTokensIfNeeded(): Promise<boolean> {
  if (isRestoringTokens) {
    console.warn("⚠️ Restauration déjà en cours, on ignore !");
    return false;
  }
  isRestoringTokens = true;

  console.log("🔄 Vérification IndexedDB pour restaurer les tokens...");

  // ✅ Timeout pour éviter un blocage si IndexedDB est lente
  const indexedDBAvailable = await Promise.race([
    verifyIndexedDBSetup(),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000))
  ]);

  if (!indexedDBAvailable) {
    console.warn("⚠️ IndexedDB non disponible ou trop lente, arrêt de la récupération.");
    isRestoringTokens = false;
    return false;
  }

  try {
    const jwtFromDB = await Promise.race([
      getItemFromStore("authStore", "jwt"),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);

    const refreshTokenFromDB = await Promise.race([
      getItemFromStore("authStore", "refreshToken"),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000))
    ]);

    const jwtFromStorage = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

    if (!jwtFromDB && !refreshTokenFromDB) {
      console.warn("⚠️ Aucun token trouvé, inutile de continuer.");
      isRestoringTokens = false;
      return false;
    }

    if (typeof jwtFromDB === "string" && jwtFromDB.trim() !== "") {
      const storedJwtValid = jwtFromStorage && !isJwtExpired(jwtFromStorage);
      if (!storedJwtValid) {
        console.log("✅ Mise à jour du JWT depuis IndexedDB...");
        localStorage.setItem("jwt", jwtFromDB);
        sessionStorage.setItem("jwt", jwtFromDB);
        document.cookie = `jwt=${jwtFromDB}; Secure; SameSite=Strict; path=/`;
      } else {
        console.log("🚀 JWT actuel déjà valide, aucune mise à jour nécessaire.");
      }
    }

    if (typeof refreshTokenFromDB === "string" && refreshTokenFromDB.trim() !== "") {
      console.log("✅ Mise à jour du Refresh Token depuis IndexedDB...");
      localStorage.setItem("refreshToken", refreshTokenFromDB);
      sessionStorage.setItem("refreshToken", refreshTokenFromDB);
      document.cookie = `refreshToken=${refreshTokenFromDB}; Secure; SameSite=Strict; path=/`;
    }

    isRestoringTokens = false;
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des tokens :", error);
    isRestoringTokens = false;
    return false;
  }
}






export async function preventIndexedDBCleanup() {
  if (indexedDBCleanupRunning) return; // 🚀 Évite plusieurs instances simultanées
  indexedDBCleanupRunning = true;

  console.log("🛡️ Protection contre la suppression d'IndexedDB...");

  try {
    // 🔥 Vérifie si `authStore` existe bien
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ `authStore` manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" }); // ✅ Harmonisation avec "id"
        }
      },
    });

    // ✅ Maintenant qu'on est sûr que `authStore` existe, on continue
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");

    // ✅ Harmonisation : Clé "id" au lieu de "key"
    await store.put({ key: "keepAlive", value: Date.now() });

    console.log("✅ IndexedDB maintenu en vie.");
  } catch (error) {
    const err = error as Error;

    console.error("❌ Impossible de protéger IndexedDB :", err);

    // 🔄 Si IndexedDB est corrompue, la supprimer et forcer une nouvelle création
    if (err.name === "NotFoundError" || err.name === "QuotaExceededError") {
      console.warn("⚠️ IndexedDB corrompue, suppression et recréation...");
      await deleteDB("AuthDB");

      console.log("🔄 Réessai après suppression...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 🔥 Attendre 1 seconde avant de relancer

      await preventIndexedDBCleanup(); // 🔄 Re-tente après recréation
    }
  }

  // 🔄 Relance la fonction uniquement si IndexedDB est bien active
  setTimeout(async () => {
    indexedDBCleanupRunning = false;
    const isDBReady = await verifyIndexedDBSetup();
    if (isDBReady) {
      preventIndexedDBCleanup();
    }
  }, 24 * 60 * 60 * 1000);
}

export let isRefreshingNow = false; // ✅ Ajout de `export`

let isRefreshing: Promise<string | null> | null = null;







// Variables globales à définir hors de la fonction
// let isRefreshing: Promise<string | null> | null = null;
// let resolvePromise: ((value: string | null) => void) | null = null;
/**
 * Vérifie si le JWT et le refresh token sont toujours présents dans IndexedDB après plusieurs heures.
 */
export async function checkIndexedDBStatus(): Promise<void> {
  try {
    // 🔥 Vérifie si `authStore` existe et le recrée si besoin
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ `authStore` manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" });
        }
      },
    });

    // ✅ Vérification après recréation
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("❌ `authStore` n'existe toujours pas après tentative de recréation !");
      return;
    }

    // ✅ Maintenant qu'on est sûr que `authStore` existe, on peut accéder aux données
    const jwt = await db.get("authStore", "jwt");
    const refreshToken = await db.get("authStore", "refreshToken");

    console.log("🔍 Vérification IndexedDB :");
    console.log("📌 JWT :", jwt ? jwt.value : "❌ Perdu !");
    console.log("📌 Refresh Token :", refreshToken ? refreshToken.value : "❌ Perdu !");
  } catch (error) {
    const err = error as Error; // ✅ Correction du typage
  
    console.error("❌ Erreur lors de la vérification d'IndexedDB :", err);
  
    if (err.name === "NotFoundError") {
      console.warn("⚠️ IndexedDB corrompue, suppression et recréation...");
      await deleteDB("AuthDB");
    }
  }
}

import { useAuthStore } from "@/stores/authStore"; // ✅ Ajout de Pinia



export async function refreshToken(): Promise<string | null> {
  if (isRefreshing) {
    console.warn("⏳ Un rafraîchissement est déjà en cours...");
    return await isRefreshing;
  }

  console.log("🔒 Activation du verrou de rafraîchissement...");
  isRefreshing = new Promise<string | null>((resolve) => {
    resolvePromise = resolve;
  });

  try {
    let token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    if (token && !isJwtExpired(token)) {
      console.log("✅ Token valide trouvé dans local/session !");
      resolvePromise?.(token);
      return token;
    }

    // 🧠 LOGS COMPLETS POUR DEBUG
    console.log("🔎 CONTENU STOCKAGE AVANT REFRESH");
    console.log("🧾 localStorage.refreshToken :", localStorage.getItem("refreshToken"));
    console.log("🧾 sessionStorage.refreshToken :", sessionStorage.getItem("refreshToken"));
    
    // 1. Priorité à localStorage
    let storedRefreshToken = localStorage.getItem("refreshToken")?.trim();

    // 2. Si non trouvé, vérifier sessionStorage
    if (!storedRefreshToken) {
      console.log("🔍 Aucun refresh token trouvé dans localStorage, vérification dans sessionStorage...");
      storedRefreshToken = sessionStorage.getItem("refreshToken")?.trim();
    }

    // 3. Si toujours pas trouvé, vérifier IndexedDB
    if (!storedRefreshToken) {
      console.log("🔍 Aucun refresh token trouvé dans localStorage ou sessionStorage, vérification dans IndexedDB...");
      const fromDb = await getRefreshTokenFromDB();
      storedRefreshToken = fromDb?.trim();
      console.log("🧾 IndexedDB.refreshToken :", storedRefreshToken);
    }

    console.log("📌 Refresh token final utilisé :", storedRefreshToken);

    if (!storedRefreshToken || storedRefreshToken === "undefined") {
      console.warn("🚨 Refresh token absent, vide ou invalide :", storedRefreshToken);
      await handleRefreshFailure();
      resolvePromise?.(null);
      return null;
    }

    // 🌐 URL
    const url = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)}`;
    console.log("🌐 URL de refresh construite :", url);
    const overlay = document.getElementById("reconnecting-overlay");
    if (overlay) overlay.style.display = "flex";
    let data;
    try {
      console.time("⏳ Durée du fetch de refresh");
      data = await Promise.race([
        fetch(url, { method: "GET" }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 35000)),
      ]);
      console.timeEnd("⏳ Durée du fetch de refresh");
    } catch (error) {
      if (error instanceof Error && error.message === "Timeout") {
        console.warn("⏳ Timeout détecté. Tentative de retry unique...");
        try {
          data = await Promise.race([
            fetch(url, { method: "GET" }).then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000)),
          ]);
          console.log("✅ Retry réussi !");
        } catch (retryError) {
          console.error("❌ Échec même après retry :", retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
    finally {
      // ⛔ Cache l'overlay même en cas d'erreur
      if (overlay) overlay.style.display = "none";
    }
    console.log("📥 Réponse brute de l'API :", data);

    if (data?.jwt && data?.refreshToken) {
      const jwt = data.jwt;
      localStorage.setItem("jwt", jwt);
      sessionStorage.setItem("jwt", jwt);

      // Mise à jour du refreshToken dans localStorage
      localStorage.setItem("refreshToken", data.refreshToken);
      const newExp = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("refreshToken_exp", newExp.toString());
      sessionStorage.setItem("refreshToken_exp", newExp.toString());

      const authStore = useAuthStore();
      authStore.setUserToken(jwt);
      authStore.user = {
        email: data.email,
        prenom: data.prenom,
        role: data.role,
        abonnement: data.abonnement,
      };

      console.log("🔄 Store mis à jour avec les nouvelles infos :", authStore.user);
     
      await syncAllStorages(jwt, data.refreshToken);

      window.dispatchEvent(new Event("jwt-refreshed"));

      resolvePromise?.(jwt);
      return jwt;
    } else {
      throw new Error("Réponse API invalide");
    }
  } catch (error) {
    console.error("❌ Erreur lors du refresh :", error);
    await handleRefreshFailure();
    resolvePromise?.(null);
    return null;
  } finally {
    console.log("🔓 Libération du verrou de rafraîchissement...");
    isRefreshing = null;
    sessionStorage.removeItem("refreshInProgress");
  }
}



// 🔥 Fonction pour supprimer un item du localStorage/sessionStorage
function removeItemFromStore(key: string, subKey?: string) {
  if (subKey) {
    // Suppression d'un sous-élément JSON s'il existe
    const storedValue = window.localStorage.getItem(key);
    if (storedValue) {
      let parsedValue = JSON.parse(storedValue);
      if (typeof parsedValue === "object" && subKey in parsedValue) {
        delete parsedValue[subKey];
        window.localStorage.setItem(key, JSON.stringify(parsedValue));
      }
    }

    const sessionValue = window.sessionStorage.getItem(key);
    if (sessionValue) {
      let parsedSession = JSON.parse(sessionValue);
      if (typeof parsedSession === "object" && subKey in parsedSession) {
        delete parsedSession[subKey];
        window.sessionStorage.setItem(key, JSON.stringify(parsedSession));
      }
    }
  } else {
    // Suppression complète de la clé
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}



// Fonction pour gérer le rafraîchissement du JWT



export async function handleRefreshToken() {
  if (isRefreshing) {
    return; // Si une tentative de rafraîchissement est déjà en cours, ne rien faire
  }

  isRefreshing = new Promise<string>((resolve, reject) => {
    resolve("nouveau JWT");
  });  // Utilisation de la variable globale en tant que promesse

  const storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // Si le refresh token est valide
  if (storedRefreshToken) {
    try {
      const response = await refreshToken(); // Appel API

      // Vérification et parse de la réponse
      let responseData;
      try {
        // Vérifier si la réponse est vide ou mal formatée
        if (!response) {
          throw new Error("Réponse du serveur vide ou mal formatée");
        }
        responseData = JSON.parse(response); // Gère le cas de `null`
      } catch (error) {
        throw new Error("Réponse du serveur invalide ou mal formée");
      }
      console.log("🔥 refreshToken - réponse : ", responseData);

      // Vérification de la réponse
      if (responseData.status === "success") {
        const newJwt = responseData.jwt;
        const newRefreshToken = responseData.refreshToken;

        // Mettre à jour les tokens
        localStorage.setItem("jwt", newJwt);
        sessionStorage.setItem("jwt", newJwt);
        localStorage.setItem("refreshToken", newRefreshToken);
        sessionStorage.setItem("refreshToken", newRefreshToken);

        console.log("✅ Nouveau JWT et Refresh Token récupérés !");
      } else {
        console.warn("⚠️ Échec du rafraîchissement du token", responseData);
        
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("❌ Erreur lors du rafraîchissement du token :", error.message);
      } else {
        console.error("❌ Erreur inconnue lors du rafraîchissement du token");
      }
      
    } finally {
      isRefreshing = null; // Libère la promesse en la réinitialisant à null
    }
  } else {
    console.warn("⚠️ Aucun refresh token trouvé !");
    
    isRefreshing = null; // Libère la promesse en la réinitialisant à null
  }
}




async function syncAllStorages(jwt: string, refreshToken: string) {
  console.log("🔄 Synchronisation des tokens dans tous les stockages...");

  localStorage.setItem("jwt", jwt);
  sessionStorage.setItem("jwt", jwt);
  localStorage.setItem("refreshToken", refreshToken);
  sessionStorage.setItem("refreshToken", refreshToken);

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `jwt=${jwt}; expires=${expires}; Secure; SameSite=None; path=/`;
  document.cookie = `refreshToken=${refreshToken}; expires=${expires}; Secure; SameSite=None; path=/`;

  // ✅ S'assurer que la base est bien prête avant d'écrire dedans
  const db = await getAuthDB(); // attend que l’upgrade se termine

  await updateJWTInIndexedDB(jwt, db);
  await updateRefreshTokenInDB(refreshToken, db);

  console.log("✅ Tokens restaurés et synchronisés !");
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

export async function updateRefreshTokenInDB(newRefreshToken: string | null, db?: IDBDatabase ) {
  if (!newRefreshToken) return;
  try {
    db = db || await getAuthDB();
    const tx = db.transaction("authStore", "readwrite");
    await tx.objectStore("authStore").put({ key: "refreshToken", value: newRefreshToken });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
    
    console.log("✅ Refresh token mis à jour dans IndexedDB :", newRefreshToken);
  } catch (err) {
    console.warn("⚠️ Erreur refreshToken →", err);
  }
}




// ✅ Mise à jour du JWT dans IndexedDB
export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBDatabase ) {
  if (!newJwt) return;
  try {
    db = db || await getAuthDB();
    const tx = db.transaction("authStore", "readwrite");
    await tx.objectStore("authStore").put({ key: "jwt", value: newJwt });
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
    
    console.log("✅ JWT mis à jour dans IndexedDB :", newJwt);
  } catch (err) {
    console.warn("⚠️ Erreur JWT →", err);
  }
}




// ✅ Mise à jour du refreshToken dans IndexedDB



// Mise à jour du refresh token dans IndexedDB



// Fonction pour gérer l’échec de rafraîchissement du token




export async function handleRefreshFailure() {
  console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");

  // 🔍 Vérifier si un utilisateur était connecté avant d'afficher le message
  const jwtExists = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  const refreshTokenExists = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (jwtExists || refreshTokenExists) {
    // ✅ L'utilisateur était bien connecté → on affiche un message + déconnexion
    showNotification("Votre session a expiré. Veuillez vous reconnecter.", "error");

    if (typeof logoutUser === "function") {
      await logoutUser(); // 🔥 Déconnexion propre
    } else {
      console.warn("⚠️ logoutUser() n'est pas défini !");
    }
  } else {
    // ❌ Aucun JWT ni refreshToken → l'utilisateur n'était pas connecté
    console.warn("⚠️ Aucun utilisateur connecté, pas besoin de déconnexion.");
  }

  // ✅ Dans tous les cas, on redirige vers la page de connexion
  

  return Promise.reject("Déconnexion forcée uniquement si l'utilisateur était connecté.");
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
    const db = await getAuthDB();
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
export async function checkAndRefreshJWT() {
await syncRefreshToken(); // Synchronisation avant de vérifier le JWT

// Vérifie si le refresh token est disponible dans tous les stockages
let storedRefreshToken = await getRefreshTokenFromDB();

if (storedRefreshToken) {
  console.log("🔄 Vérification et restauration des autres stockages...");

  // Restaurer dans localStorage, sessionStorage, cookies si nécessaire
  if (!localStorage.getItem("refreshToken")) {
    storageManager.setTokenInAllStorages("refreshToken", storedRefreshToken);
    console.log("📦 Refresh token restauré dans LocalStorage.");
  }

  if (!sessionStorage.getItem("refreshToken")) {
    storageManager.setTokenInAllStorages("refreshToken", storedRefreshToken);
    console.log("📦 Refresh token restauré dans SessionStorage.");
  }

  const cookies = document.cookie.split("; ").find(row => row.startsWith("refreshToken="));
  if (!cookies) {
    document.cookie = `refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/`;
    console.log("🍪 Refresh token restauré dans les cookies.");
  }
}

const token = await getValidToken();
console.log("🔍 Token récupéré :", token);

if (!token || isJwtExpired(token)) {
  console.warn("🚨 Pas de JWT valide, tentative de rafraîchissement...");

  // Cherche le refreshToken dans cookies, IndexedDB et LocalStorage
  let storedRefreshToken = await getRefreshTokenFromDB();

  if (!storedRefreshToken) {
    console.error("❌ Aucun refresh token disponible, déconnexion...");
    await logoutUser();
    return;
  }

  await refreshToken(); // Rafraîchit le JWT
  return;
}

try {
  const decoded = JSON.parse(atob(token.split(".")[1])); // Vérifie si le JWT est bien décodable
  console.log(`⏳ JWT expire à : ${new Date(decoded.exp * 1000).toLocaleString()}`);
} catch (e) {
  console.error("❌ JWT corrompu, forçage de déconnexion.");
  await logoutUser();
}
}
export async function getRefreshTokenExpirationFromDB(): Promise<number> {
try {
  const db = await getAuthDB();
  const tx = db.transaction("authStore", "readonly");
  const store = tx.objectStore("authStore");
  const expirationEntry = await db.get("authStore", "refreshTokenExpiration");

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
    const db = await getAuthDB();

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
    const dbToken = await getRefreshTokenFromDB();
    const localToken = localStorage.getItem("refreshToken");
    const cookieToken = document.cookie.split("; ")
      .find(row => row.startsWith("refreshToken="))?.split("=")[1];

    // 🚨 Aucun refresh token trouvé, on vérifie si le JWT est encore valide
    if (!dbToken && !localToken && !cookieToken) {
      console.warn("⚠️ Aucun refresh token trouvé, vérification du JWT...");

      let jwt = await getValidToken();
      if (jwt && !isJwtExpired(jwt)) {
        console.log("✅ JWT encore valide, pas de réinitialisation forcée.");
        isSyncing = false;
        return;
      }

      console.error("🚨 Aucun refresh token et JWT expiré, reset obligatoire !");
     // Forcer la déconnexion seulement si le JWT est aussi expiré
      isSyncing = false;
      return;
    }

    console.log("✅ Refresh token trouvé, synchronisation terminée.");
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

    // ✅ Mettre à jour le statut de connexion
    localStorage.setItem("userLogged", "false");
    localStorage.removeItem("userLogged"); // 🔥 Supprime complètement la clé pour éviter toute confusion

    // ✅ Affichage du message de déconnexion stylisé
    showLogoutMessage();

    // 🗑️ **Suppression ciblée des tokens**
    console.log("🗑️ Suppression des tokens et des données utilisateur...");
    sessionStorage.removeItem("jwt");
    sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refreshTokenExpiration");

    // 🗑️ **Suppression des informations utilisateur stockées**
    localStorage.removeItem("prenom");
    localStorage.removeItem("email");
    sessionStorage.removeItem("prenom");
    sessionStorage.removeItem("email");

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
      // Suppression de la modale de déconnexion
      const logoutMessage = document.querySelector(".logout-container");
      if (logoutMessage) {
        logoutMessage.remove();
      }
      router.replace("/login"); // 🔥 Redirection sans recharger la page
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

// Vérifie si le refreshToken est bien stocké dans IndexedDB et localStorage
const db = await getAuthDB();
const tx = db.transaction("authStore", "readwrite");
const store = tx.objectStore("authStore");

// Suppression des anciennes clés inutilisées
await store.delete("refreshjwt");
localStorage.removeItem("refreshjwt");

console.log("✅ `refreshjwt` supprimé de IndexedDB et localStorage !");

// Optionnellement, on peut synchroniser les refresh tokens entre les stockages si nécessaire
const storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
if (storedRefreshToken) {
  // S'il existe, on s'assure qu'il est mis à jour dans IndexedDB
  await updateRefreshTokenInDB(storedRefreshToken);
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
  console.log("🕒 Planification du refresh JWT...", new Date().toLocaleTimeString());

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
  const newJwt = await (refreshToken()); // ✅ Ajoute des parenthèses pour lever toute ambiguïté
  if (!newJwt) {
    console.error("❌ Refresh échoué, déconnexion en cours...");
    await logoutUser();  // Déconnecte l'utilisateur en cas d'échec du refresh
  } else {
    console.log("✅ JWT rafraîchi avec succès !");
  }
}, refreshInterval);  // Vérifie toutes les 2 ou 8 minutes
}


export async function restoreJwt(): Promise<string | null> {
  console.log("🔄 Tentative de récupération du JWT...");

  let storedJwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  if (!storedJwt) {
    storedJwt = document.cookie.split("; ")
      .find(row => row.startsWith("jwt="))?.split("=")[1] || null;
    if (storedJwt) console.log("🍪 JWT restauré depuis les cookies !");
  }

  if (!storedJwt) {
    try {
      storedJwt = await getFromIndexedDB("jwt"); // 🔥 Vérifie IndexedDB sous "authStore"
      if (storedJwt) {
        console.log("✅ JWT restauré depuis IndexedDB !");
      } else {
        console.warn("⚠️ Aucun JWT trouvé dans IndexedDB.");
      }
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du JWT depuis IndexedDB :", error);
    }
  }

  return storedJwt || null;
}


export async function restoreRefreshToken(): Promise<string | null> {
  console.log("🔄 Récupération du refresh token depuis IndexedDB...");

  let storedRefreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  if (!storedRefreshToken) {
    try {
      storedRefreshToken = await getFromIndexedDB("refreshToken"); // 🔥 Vérifie IndexedDB
      if (storedRefreshToken) {
        console.log("✅ Refresh token restauré depuis IndexedDB !");
      } else {
        console.warn("⚠️ Aucun refresh token trouvé dans IndexedDB.");
      }
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du refresh token depuis IndexedDB :", error);
    }
  }

  return storedRefreshToken || null;
}
