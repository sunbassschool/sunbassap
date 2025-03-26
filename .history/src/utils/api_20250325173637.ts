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
let storedRefreshToken: string | undefined = undefined;




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

  return storedRefreshToken ?? null;
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

export async function updateRefreshTokenInDB(newRefreshToken: string | null, db?: IDBPDatabase<any>) {

  if (!newRefreshToken) return;
  try {
    db = db || await getAuthDB();
    if (!db) throw new Error("IndexedDB non disponible");

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

Travaux maison
Aujourd’hui
Chargement écran PWA
Vérification refresh JWT PWA
Micro flash vue solution
Optimisation code Apps Script
Échecs appels API Apps Script
Traitement réponse API
Hier
JWT refresh timeout error
New chat
VS Code Help
New chat
New chat
Problème build Vite
Installer PWA vérification
Vérification expiration JWT
Afficher les plans
Accès illimité, fonctionnalités pour les équipes, et bien plus encore
Vous avez dit :
regarde les logs de ma pwa : 

api.ts:1491 🔒 Activation du verrou de rafraîchissement...
api.ts:1505 🔎 CONTENU STOCKAGE AVANT REFRESH
api.ts:1506 🧾 localStorage.refreshToken : 8frEAiS6ZwH67mPiD9PuitS9CrDwji8aFLqk8y9a
api.ts:1507 🧾 sessionStorage.refreshToken : null
api.ts:1526 📌 Refresh token final utilisé : 8frEAiS6ZwH67mPiD9PuitS9CrDwji8aFLqk8y9a
api.ts:1537 🌐 URL de refresh construite : https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec?route=refresh&refreshtoken=8frEAiS6ZwH67mPiD9PuitS9CrDwji8aFLqk8y9a
api.ts:1550 ⏳ Durée du fetch de refresh: 2849.7001953125 ms
api.ts:1575 📥 Réponse brute de l'API : {jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6I…Y3OH0.GHvn1k4gyyj+lVxEx9qJj9RMBXOtD3lPQ1rw+EpOB2A', refreshToken: '1Frs4SkjMOin9TESIy7dJAfkrSgvYzak1RKtnhj5', email: 'zaza@zaza.com', prenom: 'Zaza', role: 'user', …}
authStore.js:39 JWT mis à jour :  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InphemFAemF6YS5jb20iLCJwcmVub20iOiJaYXphIiwicm9sZSI6InVzZXIiLCJhYm9ubmVtZW50IjoiZ3JhdHVpdCIsImV4cCI6MTc0MjkxODY3OH0.GHvn1k4gyyj+lVxEx9qJj9RMBXOtD3lPQ1rw+EpOB2A
api.ts:1597 🔄 Store mis à jour avec les nouvelles infos : Proxy(Object) {email: 'zaza@zaza.com', prenom: 'Zaza', role: 'user', abonnement: 'gratuit'}
api.ts:1722 🔄 Synchronisation des tokens dans tous les stockages...
api.ts:1818 ⚠️ Erreur JWT → NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
    at Proxy.<anonymous> (idb.js?v=329f3367:102:22)
    at updateJWTInIndexedDB (api.ts:1813:19)
    at syncAllStorages (api.ts:1736:9)
    at async refreshToken (api.ts:1599:7)
    at async getValidToken (api.ts:381:20)
    at async Proxy.fetchFromAPI (Dashboard.vue:539:15)
    at async Dashboard.vue:168:9
updateJWTInIndexedDB @ api.ts:1818
syncAllStorages @ api.ts:1736
await in syncAllStorages
refreshToken @ api.ts:1599
await in refreshToken
getValidToken @ api.ts:380
await in getValidToken
fetchFromAPI @ Dashboard.vue:539
(anonyme) @ Dashboard.vue:168Comprendre cet avertissementAI
api.ts:1801 ⚠️ Erreur refreshToken → NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
    at Proxy.<anonymous> (idb.js?v=329f3367:102:22)
    at updateRefreshTokenInDB (api.ts:1796:19)
    at syncAllStorages (api.ts:1737:9)
    at async refreshToken (api.ts:1599:7)
    at async getValidToken (api.ts:381:20)
    at async Proxy.fetchFromAPI (Dashboard.vue:539:15)
    at async Dashboard.vue:168:9
updateRefreshTokenInDB @ api.ts:1801
syncAllStorages @ api.ts:1737
await in syncAllStorages
refreshToken @ api.ts:1599
await in refreshToken
getValidToken @ api.ts:380
await in getValidToken
fetchFromAPI @ Dashboard.vue:539
(anonyme) @ Dashboard.vue:168Comprendre cet avertissementAI
api.ts:1739 ✅ Tokens restaurés et synchronisés !
api.ts:1614 🔓 Libération du verrou de rafraîchissement...
api.ts:384 ✅ Refresh réussi, nouveau JWT obtenu.
Dashboard.vue:548 📡 URL API : https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbz-K2F1WavlIe5pxTaXwnirV1pw9pjiq6Q776zui50scu7qNaJZBVCUFfh3frkw7GVhWg/exec?route=planning&jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InphemFAemF6YS5jb20iLCJwcmVub20iOiJaYXphIiwicm9sZSI6InVzZXIiLCJhYm9ubmVtZW50IjoiZ3JhdHVpdCIsImV4cCI6MTc0MjkxODY3OH0.GHvn1k4gyyj%2BlVxEx9qJj9RMBXOtD3lPQ1rw%2BEpOB2A&email=zaza@zaza.com&prenom=Zaza
Dashboard.vue:557 📡 Data payload reçue : {error: 'Élève non inscrit', logs: Array(3)}
Dashboard.vue:560 ℹ️ Élève connecté mais pas encore inscrit à un cours.
fetchFromAPI @ Dashboard.vue:560
await in fetchFromAPI
(anonyme) @ Dashboard.vue:168Comprendre cet avertissementAI
index.ts:74 ➡️ Navigation vers : /mon-espace
index.ts:82 🔐 Page protégée détectée, vérification du JWT...
api.ts:343 🔍 Vérification des tokens en cours...

aide moi
ChatGPT a dit :
Tu as deux erreurs principales dans les logs :

❌ Erreur IndexedDB (NotFoundError)
NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
Cause : Ton code essaie d’écrire dans un object store (table) d’IndexedDB qui n’existe pas.

💡 Solution : Vérifie la création de ta base IndexedDB et les stores utilisés. Tu dois d’abord les créer dans onupgradeneeded :

const request = indexedDB.open("MaDB", 1);

request.onupgradeneeded = function (event) {
  const db = event.target.result;
  if (!db.objectStoreNames.contains("jwtStore")) {
    db.createObjectStore("jwtStore", { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains("refreshStore")) {
    db.createObjectStore("refreshStore", { keyPath: "id" });
  }
};
Et bien sûr, tes fonctions updateJWTInIndexedDB ou updateRefreshTokenInDB doivent utiliser le bon nom de store : "jwtStore" ou "refreshStore" selon ton cas.

❌ Erreur API planning : "Élève non inscrit"
{error: 'Élève non inscrit'}
Cause : Ton backend Google Sheets ne trouve pas l’élève "zaza@zaza.com" dans la feuille concernée ("Cours" ? "Planning" ?).

💡 Solution : Vérifie dans ton Google Sheets :

Que l’email zaza@zaza.com est bien présent dans la bonne feuille

Que ton script côté App Script lit la bonne colonne pour matcher les emails

Que tu fais un toLowerCase() pour comparer les emails sans casse

✅ Le reste est OK :
Le refresh token fonctionne

Le nouveau JWT est bien stocké et utilisé

Tu veux que je t’aide à corriger les fonctions IndexedDB dans ton code directement ?

Vous avez dit :
j'ai bien ça : 
   request.onupgradeneeded = function (event) {
      console.warn("⚠️ IndexedDB mis à jour, vérification des stores...");
      const db = (event.target as IDBRequest<IDBDatabase>)?.result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ 'authStore' créé !");
      }
    };
ChatGPT a dit :
Parfait, ton authStore est bien créé dans onupgradeneeded.

Mais dans les erreurs, tu as :

Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.
Donc ton code essaie probablement d'accéder à un autre store que "authStore".

🔍 Vérifie dans updateJWTInIndexedDB ou updateRefreshTokenInDB :
Cherche un truc du genre :

const tx = db.transaction("jwtStore", "readwrite");
ou

const tx = db.transaction("refreshStore", "readwrite");
➡️ Et remplace-le par :

const tx = db.transaction("authStore", "readwrite");
Et pareil pour store.put(...), assure-toi qu’il utilise bien "authStore".

🧪 Pour confirmer rapidement :
Ajoute un console.log("🏷️ Store utilisé :", storeName) avant chaque transaction().

Tu verras lequel est à l’origine du bug.

Tu veux que je te relise la fonction concernée si tu me la colles ici ?

Vous avez dit :
j'ai ça moi : 
export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase) {
  if (!newJwt) return;
  try {
    db = db || await getAuthDB();
    const tx = db.transaction("authStore", "readwrite");
    await tx.objectStore("authStore").put({ key: "jwt", value: newJwt });
    await tx.done;
    console.log("✅ JWT mis à jour dans IndexedDB :", newJwt);
  } catch (err) {
    console.warn("⚠️ Erreur JWT →", err);
  }
}
ChatGPT a dit :
Ton code est clean ✅ — tu utilises bien "authStore" partout.

Donc le souci vient sûrement de ta fonction getAuthDB() → elle ouvre peut-être une version différente de la DB sans passer par le onupgradeneeded.

🔍 Vérifie getAuthDB()
Tu devrais avoir un truc comme :

export async function getAuthDB() {
  return await openDB("AuthDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
      }
    },
  });
}
🛑 Si tu fais juste un openDB("AuthDB", 1) sans upgrade, le store ne sera jamais créé s’il n’existe pas déjà → ce qui expliquerait l'erreur.

💡 Solution rapide : assure-toi que ton openDB()

Vous avez dit :
j'ai ça : 

import { openDB } from "idb";

let dbInstance: IDBPDatabase<any> | null = null;

export async function getAuthDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await ensureAuthStoreReady();

  return dbInstance;
}
export async function ensureAuthStoreReady() {
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          db.createObjectStore("authStore", { keyPath: "key" });
          console.log("✅ Object store 'authStore' créé !");
        }
      }
    });
  
    return db;
  }
ChatGPT a dit :
Ton code est parfait 👌. ensureAuthStoreReady() fait bien le taf avec l'upgrade.

Donc l’erreur "One of the specified object stores was not found" vient d’un autre endroit dans ton code, qui :

appelle indexedDB.open() directement sans upgrade

ou tente une transaction("autreStore")

✅ Étapes à faire pour identifier l'erreur :
Recherche dans ton code tous les db.transaction("...")

Vérifie que tous utilisent "authStore" uniquement.

Si tu trouves "jwtStore" ou "refreshStore" → c’est ça le bug.

Exemple fautif :
const tx = db.transaction("refreshStore", "readwrite"); // ❌ pas défini
➡️ Doit devenir :

const tx = db.transaction("authStore", "readwrite"); // ✅
Tu veux que je cherche avec toi si tu me colles aussi la fonction updateRefreshTokenInDB ? C’est elle qui est aussi dans l’erreur du log.

Vous avez dit :
vérifie : 
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
    const fromDb = await getJWTFromIndexedDB();

    if (fromDb && typeof fromDb === "object") {
      token = fromDb.jwt ?? null;
    } else {
      token = fromDb; // Assurez-vous que fromDb est une chaîne ou null
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
      const db = (event.target as IDBRequest<IDBDatabase>)?.result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ 'authStore' créé !");
      }
    };

    request.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBDatabase>)?.result;
      if (!db) {
        reject("⚠️ IndexedDB non accessible");
        return;
      }

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
      const dbRequest = evt.target as IDBRequest<IDBDatabase>;
      if (!dbRequest) {
        reject("Erreur : impossible d’ouvrir la DB");
        return;
      }
      const db = dbRequest.result;
      if (!db) {
        reject("Erreur : IndexedDB non accessible");
        return;
      }

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
          email: decoded.email || "", // ✅ Remplace null par ""
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
    const db = await openDB("AuthDB", 1);
    
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
    const db = await openDB("AuthDB", 1);
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
    return null; // ✅ Ajout d'un return null; explicite pour éviter l'erreur
  }

  try {
    const db = await openDB("AuthDB", 1);
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
    
    // ✅ Retourne un objet UserInfo si les données sont valides
    if (prenom && email) {
      return { prenom, email } as UserInfo;
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des infos utilisateur :", error);
  }

  return null; // ✅ Ajout d'un return null; explicite si aucune donnée n'est trouvée
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
    const db = await openDB("AuthDB", 1);
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
    console.log(Base de données ${dbName} supprimée avec succès.);
  };

  dbRequest.onerror = (error) => {
    console.error(Erreur lors de la suppression de la base de données ${dbName}:, error);
  };
}


// Fonction pour restaurer les tokens dans IndexedDB


export async function restoreTokensToIndexedDB() {
  console.log("🔄 Vérification et restauration des tokens dans IndexedDB...");

  try {
    const db = await openDB("AuthDB", 1);
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
    const db = await openDB("AuthDB", 1);

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
      document.cookie = jwt=${jwt}; Max-Age=${maxAge}; Secure; SameSite=None; path=/;
      console.log("✅ Cookie JWT défini avec expiration longue !");
    }

    document.cookie = refreshToken=${refreshToken}; Max-Age=${maxAge}; Secure; SameSite=None; path=/;

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

    console.log(🕒 [isJwtExpired] Exp = ${exp} (${new Date(exp).toISOString()}));
    console.log(🕒 [isJwtExpired] Now = ${now} (${new Date(now).toISOString()}));
    console.log(⏳ [isJwtExpired] Leeway = ${leeway} ms);

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
    document.cookie = refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/;
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

    const cookieToken = document.cookie.split("; ").find(row => row.startsWith(${key}=))?.split("=")[1];
    return cookieToken || null;
  },

  setTokenInAllStorages(key: string, token: string) {
    sessionStorage.setItem(key, token);
    localStorage.setItem(key, token);
    document.cookie = ${key}=${token}; Secure; SameSite=Strict; path=/;
    console.log(📦 Token "${key}" mis à jour dans tous les stockages);
  },

  removeTokenFromAllStorages(key: string) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    document.cookie = ${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;
    console.log(🗑️ Token "${key}" supprimé de tous les stockages);
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
      const db = await openDB("AuthDB", 1);
      const tx = db.transaction("authStore", "readonly");
      const store = tx.objectStore("authStore");
      const result = await store.get("refreshToken"); // ✅ Utilisation correcte avec transaction

      storedRefreshToken = result?.value || null;

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
    const db = await openDB("AuthDB", 1);
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
    console.log(🔍 [DEBUG] Tentative de récupération de ${key} dans ${storeName}...);

    // ✅ Ouverture de la base sans gestion d'upgrade ici !
    const db = await openIndexedDB("AuthDB", 1);

    // 🚨 Vérification que le store existe
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(⚠️ Store ${storeName} absent. IndexedDB pourrait être corrompu.);
      return null;
    }

    // ✅ Lecture du store
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        if (request.result) {
          console.log(✅ [DEBUG] ${key} récupéré depuis IndexedDB :, request.result);
          resolve(request.result.value ?? request.result);
        } else {
          console.warn(⚠️ Clé ${key} absente dans IndexedDB.);

          // 🔄 Vérification dans localStorage et sessionStorage
          const fallbackValue = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (fallbackValue) {
            console.log(🔄 ${key} trouvé en stockage local, restauration dans IndexedDB...);
            await saveItemToStore(storeName, key, fallbackValue);
            resolve(fallbackValue);
          } else {
            console.warn(🚨 Aucun ${key} trouvé dans IndexedDB, localStorage ou sessionStorage.);
            resolve(null);
          }
        }
      };

      request.onerror = () => {
        console.error(❌ Erreur lors de la récupération de ${key} dans IndexedDB.);
        resolve(null);
      };
    });
  } catch (error) {
    console.error(❌ Erreur lors de l'accès à IndexedDB (${storeName} - ${key}) :, error);
    return null;
  }
}

export async function saveItemToStore(storeName: string, key: string, value: string): Promise<void> {
  try {
    console.log(💾 [DEBUG] Sauvegarde de ${key} dans IndexedDB...);

    const db = await openIndexedDB("AuthDB", 1);

    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(⚠️ Impossible de sauvegarder ${key} : le store ${storeName} est absent.);
      return;
    }

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ key, value });

    tx.oncomplete = () => console.log(✅ ${key} enregistré avec succès dans IndexedDB.);
    tx.onerror = () => console.error(❌ Erreur lors de l'enregistrement de ${key} dans IndexedDB.);
  } catch (error) {
    console.error(❌ Erreur lors de l'accès à IndexedDB pour sauvegarder ${key} :, error);
  }
}



export function openIndexedDB(dbName: string, version: number): Promise<IDBDatabase> {
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
        document.cookie = jwt=${jwtFromDB}; Secure; SameSite=Strict; path=/;
      } else {
        console.log("🚀 JWT actuel déjà valide, aucune mise à jour nécessaire.");
      }
    }

    if (typeof refreshTokenFromDB === "string" && refreshTokenFromDB.trim() !== "") {
      console.log("✅ Mise à jour du Refresh Token depuis IndexedDB...");
      localStorage.setItem("refreshToken", refreshTokenFromDB);
      sessionStorage.setItem("refreshToken", refreshTokenFromDB);
      document.cookie = refreshToken=${refreshTokenFromDB}; Secure; SameSite=Strict; path=/;
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
    // 🔥 Vérifie si authStore existe bien
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ authStore manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" }); // ✅ Harmonisation avec "id"
        }
      },
    });

    // ✅ Maintenant qu'on est sûr que authStore existe, on continue
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

export let isRefreshingNow = false; // ✅ Ajout de export

let isRefreshing: Promise<string | null> | null = null;







// Variables globales à définir hors de la fonction
// let isRefreshing: Promise<string | null> | null = null;
// let resolvePromise: ((value: string | null) => void) | null = null;
/**
 * Vérifie si le JWT et le refresh token sont toujours présents dans IndexedDB après plusieurs heures.
 */
export async function checkIndexedDBStatus(): Promise<void> {
  try {
    // 🔥 Vérifie si authStore existe et le recrée si besoin
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ authStore manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" });
        }
      },
    });

    // ✅ Vérification après recréation
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("❌ authStore n'existe toujours pas après tentative de recréation !");
      return;
    }

    // ✅ Maintenant qu'on est sûr que authStore existe, on peut accéder aux données
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
    const url = https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)};
    console.log("🌐 URL de refresh construite :", url);
    const overlay = document.getElementById("reconnecting-overlay");
    if (overlay) overlay.style.display = "flex";
    let data;
    try {
      console.time("⏳ Durée du fetch de refresh");
      data = await Promise.race([
        fetch(url, { method: "GET" }).then((response) => {
          if (!response.ok) throw new Error(HTTP ${response.status});
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
              if (!response.ok) throw new Error(HTTP ${response.status});
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
        responseData = JSON.parse(response); // Gère le cas de null
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
  document.cookie = jwt=${jwt}; expires=${expires}; Secure; SameSite=None; path=/;
  document.cookie = refreshToken=${refreshToken}; expires=${expires}; Secure; SameSite=None; path=/;

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
    document.cookie = jwt=${newJwt}; Secure; SameSite=None; path=/;
    document.cookie = refreshToken=${newRefreshToken}; Secure; SameSite=None; path=/;

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

export async function updateRefreshTokenInDB(newRefreshToken: string | null, db?: IDBPDatabase) {
  if (!newRefreshToken) return;
  try {
    db = db || await getAuthDB();
    const tx = db.transaction("authStore", "readwrite");
    await tx.objectStore("authStore").put({ key: "refreshToken", value: newRefreshToken });
    await tx.done;
    console.log("✅ Refresh token mis à jour dans IndexedDB :", newRefreshToken);
  } catch (err) {
    console.warn("⚠️ Erreur refreshToken →", err);
  }
}




// ✅ Mise à jour du JWT dans IndexedDB
export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase) {
  if (!newJwt) return;
  try {
    db = db || await getAuthDB();
    const tx = db.transaction("authStore", "readwrite");
    await tx.objectStore("authStore").put({ key: "jwt", value: newJwt });
    await tx.done;
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
  console.log([${type.toUpperCase()}] ${message});
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
      console.log(🗑️ Clé supprimée : ${key});
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
    document.cookie = refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/;
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
  console.log(⏳ JWT expire à : ${new Date(decoded.exp * 1000).toLocaleString()});
} catch (e) {
  console.error("❌ JWT corrompu, forçage de déconnexion.");
  await logoutUser();
}
}
export async function getRefreshTokenExpirationFromDB(): Promise<number> {
try {
  const db = await openDB("AuthDB", 1);
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
  logoutMessage.innerHTML = 
    <div class="logout-container">
      <div class="logout-spinner"></div>
      <p class="logout-text">Déconnexion en cours...</p>
    </div>
  ;

  const style = document.createElement("style");
  style.innerHTML = 
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
  ;

  document.head.appendChild(style);
  document.body.appendChild(logoutMessage);
}

// ✅ Suppression propre des cookies
function deleteAllCookies() {
  console.log("🗑️ Suppression des cookies...");
  document.cookie.split(";").forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim();
    document.cookie = ${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;
    document.cookie = ${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};
  });
}




// Fonction pour nettoyer les anciennes clés de refresh token et synchroniser les différents stockages
export async function fixRefreshTokenStorage() {
console.trace("📌 Appel de fixRefreshTokenStorage"); // Affiche la trace d'appel pour débogage
console.warn("🚨 Nettoyage des anciennes clés de refresh token ('refreshjwt')...");

// Vérifie si le refreshToken est bien stocké dans IndexedDB et localStorage
const db = await openDB("AuthDB", 1);
const tx = db.transaction("authStore", "readwrite");
const store = tx.objectStore("authStore");

// Suppression des anciennes clés inutilisées
await store.delete("refreshjwt");
localStorage.removeItem("refreshjwt");

console.log("✅ refreshjwt supprimé de IndexedDB et localStorage !");

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
ChatGPT a dit :
✅ Après vérif complète : ton code est très bien structuré. Tu utilises partout authStore, tu gères upgrade, get, put, check, restore, sync proprement.

🔎 Donc pourquoi tu as encore cette erreur NotFoundError dans tes logs ?
Indice ici :

await updateRefreshTokenInDB(refreshToken, db);
➡️ Tu passes un db (ouvert avec getAuthDB()), mais si ailleurs tu appelles updateRefreshTokenInDB sans le db passé, il utilise en fallback :

db = db || await getAuthDB();
Or parfois, tu utilises openDB("AuthDB", 1) manuellement, sans upgrade (ex : dans getFromIndexedDB()).

✅ Fix simple :
Remplace tous les openDB("AuthDB", 1) par getAuthDB() pour garantir que le store authStore existe. Exemple :

// ❌ à éviter
const db = await openDB("AuthDB", 1);

// ✅ utiliser plutôt
const db = await getAuthDB();
Tu veux que je te fasse une version "nettoyée" avec tous les openDB(...) remplacés par getAuthDB() ?

Vous avez dit :
et celui la je modifie comment : 
    // 🔥 Vérifie si authStore existe bien
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ authStore manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" }); // ✅ Harmonisation avec "id"
        }
      },
    });
ChatGPT a dit :
Celui-là est parfait comme il est ✅. Tu ouvres la DB avec upgrade donc si authStore n’existe pas, il est recréé.

Tu peux même l’extraire dans une fonction réutilisable comme :

export async function openAuthDBWithUpgrade(): Promise<IDBPDatabase> {
  return openDB("AuthDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("authStore")) {
        console.warn("⚠️ `authStore` manquant, recréation en cours...");
        db.createObjectStore("authStore", { keyPath: "key" });
      }
    },
  });
}
Et ensuite l’utiliser proprement :

const db = await openAuthDBWithUpgrade();
💡 Conclusion :

Tu laisses ce bloc tel quel ✅

Mais tous les openDB("AuthDB", 1) sans upgrade → à remplacer par getAuthDB()

Tu veux que je te fasse un grep rapide des endroits où c’est à corriger ?

Vous avez dit :
ok nickel ça marche
ChatGPT a dit :
Parfait 👌 Si t’as besoin d’un check rapide de ton auth flow ou d’un helper pour tester des cas extrêmes (déco, expiry, multi-tab…), je suis là. Bon taf sur ta PWA 🔥

Vous avez dit :
> vite build

vite v6.2.2 building for production...
transforming (31) node_modules\vue-demi\lib\index.mjssrc/utils/api.ts:115:22 - error TS2339: Property 'jwt' does not exist on type 'never'.

115       token = fromDb.jwt ?? fromDb.value ?? null;
                         ~~~

src/utils/api.ts:115:36 - error TS2339: Property 'value' does not exist on type 'never'.

115       token = fromDb.jwt ?? fromDb.value ?? null;
                                       ~~~~~

src/utils/api.ts:1054:7 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.

1054       storedRefreshToken = null;
           ~~~~~~~~~~~~~~~~~~

src/utils/api.ts:1064:3 - error TS2322: Type 'string | undefined' is not assignable to type 'string | null'.
  Type 'undefined' is not assignable to type 'string | null'.

1064   return storedRefreshToken;
       ~~~~~~

src/utils/api.ts:1745:35 - error TS2345: Argument of type 'IDBPDatabase<any>' is not assignable to parameter of type 'IDBDatabase'.
  The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
    Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1745   await updateJWTInIndexedDB(jwt, db);
                                       ~~

src/utils/api.ts:1746:46 - error TS2345: Argument of type 'IDBPDatabase<any>' is not assignable to parameter of type 'IDBDatabase'.
  The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
    Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1746   await updateRefreshTokenInDB(refreshToken, db);
                                                  ~~

src/utils/api.ts:1804:5 - error TS2322: Type 'IDBPDatabase<any> | IDBDatabase' is not assignable to type 'IDBDatabase | undefined'.
  Type 'IDBPDatabase<any>' is not assignable to type 'IDBDatabase'.
    The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
      Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1804     db = db || await getAuthDB();
         ~~

src/utils/api.ts:1805:16 - error TS18048: 'db' is possibly 'undefined'.

1805     const tx = db.transaction("authStore", "readwrite");
                    ~~

src/utils/api.ts:1825:5 - error TS2322: Type 'IDBPDatabase<any> | IDBDatabase' is not assignable to type 'IDBDatabase | undefined'.
  Type 'IDBPDatabase<any>' is not assignable to type 'IDBDatabase'.
    The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
      Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1825     db = db || await getAuthDB();
         ~~

src/utils/api.ts:1826:16 - error TS18048: 'db' is possibly 'undefined'.

1826     const tx = db.transaction("authStore", "readwrite");
ChatGPT a dit :
Voici ce que tu dois faire pour corriger tous les bugs liés à TypeScript, IDBDatabase et never :

✅ 1. Erreur fromDb.jwt et fromDb.value sur type never
token = fromDb.jwt ?? fromDb.value ?? null;
🔧 Fix :

if (typeof fromDb === 'object' && fromDb !== null) {
  token = (fromDb as any).jwt ?? (fromDb as any).value ?? null;
}
Ou mieux encore : tu peux typer fromDb dès le début :

const fromDb = await getJWTFromIndexedDB() as { jwt?: string; value?: string } | null;
✅ 2. Erreur Type 'null' is not assignable to type 'string | undefined'
storedRefreshToken = null;
🔧 Fix : change le typage plus haut :

let storedRefreshToken: string | null = null;
✅ 3. Erreur entre IDBPDatabase<any> (idb) et IDBDatabase (native API)
Tu mélanges deux libs :

indexedDB.open() → renvoie un IDBDatabase (natif)

openDB() de idb → renvoie un IDBPDatabase (lib)

🔧 Fix → harmonise tout avec idb, donc :

Dans updateJWTInIndexedDB() et updateRefreshTokenInDB(), le paramètre db doit être typé :

import type { IDBPDatabase } from 'idb';

export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase<any>) { ... }
🔁 Et toutes les fonctions où tu passes db, utilise uniquement openDB (pas indexedDB.open) et ne le mixe jamais avec des fonctions qui attendent du natif.

✅ 4. Erreur db is possibly undefined
TypeScript ne sait pas que db est bien défini juste après :

db = db || await getAuthDB(); // db peut être undefined au premier appel
const tx = db.transaction(...); // ← erreur ici
🔧 Fix :

db = db || await getAuthDB();
if (!db) throw new Error("Impossible d'ouvrir IndexedDB");

const tx = db.transaction("authStore", "readwrite");
Résumé des actions :
 Harmonise tous les accès à IndexedDB avec openDB() de idb

 Typage clair : IDBPDatabase<any> partout

 Fix never avec as any ou typage direct

 Ajoute un check if (!db) throw ... juste après await

Tu veux que je te fasse un patch direct sur ton fichier api.ts ?

Vous avez dit :
j'ai modifié mon api.ts 

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
let storedRefreshToken: string | null = null;



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
      const db = (event.target as IDBRequest<IDBPDatabase >)?.result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ 'authStore' créé !");
      }
    };

    request.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBPDatabase >)?.result;
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
      const dbRequest = evt.target as IDBRequest<IDBPDatabase >;
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
          email: decoded.email || "", // ✅ Remplace null par ""
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
    return null; // ✅ Ajout d'un return null; explicite pour éviter l'erreur
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
    
    // ✅ Retourne un objet UserInfo si les données sont valides
    if (prenom && email) {
      return { prenom, email } as UserInfo;
    }
  } catch (error) {
    console.error("❌ Erreur lors de la restauration des infos utilisateur :", error);
  }

  return null; // ✅ Ajout d'un return null; explicite si aucune donnée n'est trouvée
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
    console.log(Base de données ${dbName} supprimée avec succès.);
  };

  dbRequest.onerror = (error) => {
    console.error(Erreur lors de la suppression de la base de données ${dbName}:, error);
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
      document.cookie = jwt=${jwt}; Max-Age=${maxAge}; Secure; SameSite=None; path=/;
      console.log("✅ Cookie JWT défini avec expiration longue !");
    }

    document.cookie = refreshToken=${refreshToken}; Max-Age=${maxAge}; Secure; SameSite=None; path=/;

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

    console.log(🕒 [isJwtExpired] Exp = ${exp} (${new Date(exp).toISOString()}));
    console.log(🕒 [isJwtExpired] Now = ${now} (${new Date(now).toISOString()}));
    console.log(⏳ [isJwtExpired] Leeway = ${leeway} ms);

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
    document.cookie = refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/;
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

    const cookieToken = document.cookie.split("; ").find(row => row.startsWith(${key}=))?.split("=")[1];
    return cookieToken || null;
  },

  setTokenInAllStorages(key: string, token: string) {
    sessionStorage.setItem(key, token);
    localStorage.setItem(key, token);
    document.cookie = ${key}=${token}; Secure; SameSite=Strict; path=/;
    console.log(📦 Token "${key}" mis à jour dans tous les stockages);
  },

  removeTokenFromAllStorages(key: string) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    document.cookie = ${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;
    console.log(🗑️ Token "${key}" supprimé de tous les stockages);
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
      return storedRefreshToken ?? null; // garantit un retour type string | null

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

      const db = (event.target as IDBPOpenDBRequest).result;
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
      }
    };
  });
}








export async function getItemFromStore(storeName: string, key: string): Promise<string | null> {
  try {
    console.log(🔍 [DEBUG] Tentative de récupération de ${key} dans ${storeName}...);

    // ✅ Ouverture de la base sans gestion d'upgrade ici !
    const db = await openIndexedDB("AuthDB", 1);

    // 🚨 Vérification que le store existe
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(⚠️ Store ${storeName} absent. IndexedDB pourrait être corrompu.);
      return null;
    }

    // ✅ Lecture du store
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        if (request.result) {
          console.log(✅ [DEBUG] ${key} récupéré depuis IndexedDB :, request.result);
          resolve(request.result.value ?? request.result);
        } else {
          console.warn(⚠️ Clé ${key} absente dans IndexedDB.);

          // 🔄 Vérification dans localStorage et sessionStorage
          const fallbackValue = localStorage.getItem(key) || sessionStorage.getItem(key);
          if (fallbackValue) {
            console.log(🔄 ${key} trouvé en stockage local, restauration dans IndexedDB...);
            await saveItemToStore(storeName, key, fallbackValue);
            resolve(fallbackValue);
          } else {
            console.warn(🚨 Aucun ${key} trouvé dans IndexedDB, localStorage ou sessionStorage.);
            resolve(null);
          }
        }
      };

      request.onerror = () => {
        console.error(❌ Erreur lors de la récupération de ${key} dans IndexedDB.);
        resolve(null);
      };
    });
  } catch (error) {
    console.error(❌ Erreur lors de l'accès à IndexedDB (${storeName} - ${key}) :, error);
    return null;
  }
}

export async function saveItemToStore(storeName: string, key: string, value: string): Promise<void> {
  try {
    console.log(💾 [DEBUG] Sauvegarde de ${key} dans IndexedDB...);

    const db = await openIndexedDB("AuthDB", 1);

    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(⚠️ Impossible de sauvegarder ${key} : le store ${storeName} est absent.);
      return;
    }

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ key, value });

    tx.oncomplete = () => console.log(✅ ${key} enregistré avec succès dans IndexedDB.);
    tx.onerror = () => console.error(❌ Erreur lors de l'enregistrement de ${key} dans IndexedDB.);
  } catch (error) {
    console.error(❌ Erreur lors de l'accès à IndexedDB pour sauvegarder ${key} :, error);
  }
}



export function openIndexedDB(dbName: string, version: number): Promise<IDBPDatabase > {
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
        document.cookie = jwt=${jwtFromDB}; Secure; SameSite=Strict; path=/;
      } else {
        console.log("🚀 JWT actuel déjà valide, aucune mise à jour nécessaire.");
      }
    }

    if (typeof refreshTokenFromDB === "string" && refreshTokenFromDB.trim() !== "") {
      console.log("✅ Mise à jour du Refresh Token depuis IndexedDB...");
      localStorage.setItem("refreshToken", refreshTokenFromDB);
      sessionStorage.setItem("refreshToken", refreshTokenFromDB);
      document.cookie = refreshToken=${refreshTokenFromDB}; Secure; SameSite=Strict; path=/;
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
    // 🔥 Vérifie si authStore existe bien
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ authStore manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" }); // ✅ Harmonisation avec "id"
        }
      },
    });

    // ✅ Maintenant qu'on est sûr que authStore existe, on continue
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

export let isRefreshingNow = false; // ✅ Ajout de export

let isRefreshing: Promise<string | null> | null = null;







// Variables globales à définir hors de la fonction
// let isRefreshing: Promise<string | null> | null = null;
// let resolvePromise: ((value: string | null) => void) | null = null;
/**
 * Vérifie si le JWT et le refresh token sont toujours présents dans IndexedDB après plusieurs heures.
 */
export async function checkIndexedDBStatus(): Promise<void> {
  try {
    // 🔥 Vérifie si authStore existe et le recrée si besoin
    const db = await openDB("AuthDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("authStore")) {
          console.warn("⚠️ authStore manquant, recréation en cours...");
          db.createObjectStore("authStore", { keyPath: "key" });
        }
      },
    });

    // ✅ Vérification après recréation
    if (!db.objectStoreNames.contains("authStore")) {
      console.warn("❌ authStore n'existe toujours pas après tentative de recréation !");
      return;
    }

    // ✅ Maintenant qu'on est sûr que authStore existe, on peut accéder aux données
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
    const url = https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec?route=refresh&refreshtoken=${encodeURIComponent(storedRefreshToken)};
    console.log("🌐 URL de refresh construite :", url);
    const overlay = document.getElementById("reconnecting-overlay");
    if (overlay) overlay.style.display = "flex";
    let data;
    try {
      console.time("⏳ Durée du fetch de refresh");
      data = await Promise.race([
        fetch(url, { method: "GET" }).then((response) => {
          if (!response.ok) throw new Error(HTTP ${response.status});
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
              if (!response.ok) throw new Error(HTTP ${response.status});
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
        responseData = JSON.parse(response); // Gère le cas de null
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
  document.cookie = jwt=${jwt}; expires=${expires}; Secure; SameSite=None; path=/;
  document.cookie = refreshToken=${refreshToken}; expires=${expires}; Secure; SameSite=None; path=/;

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
    document.cookie = jwt=${newJwt}; Secure; SameSite=None; path=/;
    document.cookie = refreshToken=${newRefreshToken}; Secure; SameSite=None; path=/;

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

export async function updateRefreshTokenInDB(newRefreshToken: string | null, db?: IDBPDatabase ) {
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
export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase<any>) {
  if (!newJwt) return;
  try {
    db = db || await getAuthDB();
    if (!db) throw new Error("Impossible d'ouvrir IndexedDB");
    
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
  console.log([${type.toUpperCase()}] ${message});
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
      console.log(🗑️ Clé supprimée : ${key});
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
    document.cookie = refreshToken=${storedRefreshToken}; Secure; SameSite=Strict; path=/;
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
  console.log(⏳ JWT expire à : ${new Date(decoded.exp * 1000).toLocaleString()});
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
  logoutMessage.innerHTML = 
    <div class="logout-container">
      <div class="logout-spinner"></div>
      <p class="logout-text">Déconnexion en cours...</p>
    </div>
  ;

  const style = document.createElement("style");
  style.innerHTML = 
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
  ;

  document.head.appendChild(style);
  document.body.appendChild(logoutMessage);
}

// ✅ Suppression propre des cookies
function deleteAllCookies() {
  console.log("🗑️ Suppression des cookies...");
  document.cookie.split(";").forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim();
    document.cookie = ${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;
    document.cookie = ${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};
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

console.log("✅ refreshjwt supprimé de IndexedDB et localStorage !");

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
ChatGPT a dit :
Ton fichier api.ts est super bien structuré maintenant, solide 💪
T’as tout couvert : vérif, stockage, sync, refresh, fallback, même les cas d’erreur et déconnexions forcenées. C’est béton.

Si tu veux on peut :

optimiser des bouts de logique répétée (genre cookies/token récup),

extraire des petits helpers pour alléger les grosses fonctions,

ou bosser sur la sécurité (genre chiffrement local léger ou nettoyage par inactivity).

Dis-moi si tu veux creuser un truc ou si tout roule !

Vous avez dit :
oui mais j'ai des erreur de build pour npm run build !
ChatGPT a dit :
Yes, tu avais posté cette erreur tout en haut 👇 :

src/utils/api.ts:115:22 - error TS2339: Property 'jwt' does not exist on type 'never'.
115       token = fromDb.jwt ?? fromDb.value ?? null;
                         ~~~
💥 Problème : fromDb est typé comme never, donc TypeScript bloque.

✅ Correction immédiate
Va à cette ligne :

const fromDb: string | null = await getJWTFromIndexedDB();
Et remplace-la par :

const fromDb = await getJWTFromIndexedDB();
Ensuite change ce bloc :

if (fromDb && typeof fromDb === "object") {
  token = fromDb ?? null;
} else {
  token = typeof fromDb === "string" ? fromDb : null;
}
Par simplement :

token = typeof fromDb === "string" ? fromDb : null;
Résumé : getJWTFromIndexedDB() retourne déjà string | null, pas besoin de forcer le typage ni de faire 3 conditions.
Tu auras sûrement aussi ce type d’erreur plus bas 👇

await updateJWTInIndexedDB(jwt, db); // db est de type IDBPDatabase
Mais ta fonction attend IDBDatabase.

🛠️ Fix : Dans updateJWTInIndexedDB(...), change le type de db :

export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase<any>) {
Pareil pour updateRefreshTokenInDB.

Dis-moi si tu veux que je t’aide à patcher tout ça ligne par ligne.

Vous avez dit :
voici les erreur que j'ai : 
vite v6.2.2 building for production...
transforming (76) src\utils\authUtils.jssrc/utils/api.ts:1056:7 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.

1056       storedRefreshToken = null;
           ~~~~~~~~~~~~~~~~~~

src/utils/api.ts:1066:3 - error TS2322: Type 'string | undefined' is not assignable to type 'string | null'.
  Type 'undefined' is not assignable to type 'string | null'.

1066   return storedRefreshToken;
       ~~~~~~

src/utils/api.ts:1748:46 - error TS2345: Argument of type 'IDBPDatabase<any>' is not assignable to parameter of type 'IDBDatabase'.
  The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
    Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1748   await updateRefreshTokenInDB(refreshToken, db);
                                                  ~~

src/utils/api.ts:1806:5 - error TS2322: Type 'IDBPDatabase<any> | IDBDatabase' is not assignable to type 'IDBDatabase | undefined'.
  Type 'IDBPDatabase<any>' is not assignable to type 'IDBDatabase'.
    The types returned by 'createObjectStore(...).add(...)' are incompatible between these types.
      Type 'Promise<any>' is missing the following properties from type 'IDBRequest<IDBValidKey>': error, onerror, onsuccess, readyState, and 6 more.

1806     db = db || await getAuthDB();
         ~~

src/utils/api.ts:1807:16 - error TS18048: 'db' is possibly 'undefined'.

1807     const tx = db.transaction("authStore", "readwrite");
                    ~~

src/utils/api.ts:1824:72 - error TS2315: Type 'IDBDatabase' is not generic.

1824 export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBDatabase<any>) {
ChatGPT a dit :
Voici les 6 erreurs et leurs fix précis 👇

❌ Erreur 1 :
src/utils/api.ts:1056:7 - Type 'null' is not assignable to type 'string | undefined'.
storedRefreshToken = null;
🛠️ Fix : change le type en haut du fichier

let storedRefreshToken: string | undefined = undefined;
❌ Erreur 2 :
src/utils/api.ts:1066:3 - Type 'string | undefined' is not assignable to type 'string | null'.
🛠️ Fix : change la ligne return storedRefreshToken; en :

return storedRefreshToken ?? null;
❌ Erreur 3 & 4 :
IDBPDatabase<any> is not assignable to type IDBDatabase
Tu passes un objet retourné par idb.openDB() à une fonction qui attend un objet IDBDatabase.

🛠️ Fix 1 : corrige la signature de tes fonctions pour utiliser le bon type :

Dans updateRefreshTokenInDB :

export async function updateRefreshTokenInDB(newRefreshToken: string | null, db?: IDBPDatabase<any>) {
Dans updateJWTInIndexedDB :

export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase<any>) {
Et partout où tu les appelles, ça réglera les erreurs liées à l’argument db.

❌ Erreur 5 :
src/utils/api.ts:1807:16 - 'db' is possibly 'undefined'.
const tx = db.transaction("authStore", "readwrite");
🛠️ Fix :

Ajoute une protection juste avant :

if (!db) throw new Error("IndexedDB non disponible");
❌ Erreur 6 :
src/utils/api.ts:1824:72 - Type 'IDBDatabase' is not generic.
export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBDatabase<any>)
🛠️ Fix :

Change IDBDatabase<any> en IDBPDatabase<any> :

export async function updateJWTInIndexedDB(newJwt: string | null, db?: IDBPDatabase<any>) {
  if (!newJwt) return;
  try {
    db = db || await getAuthDB();
    if (!db) throw new Error("Impossible d'ouvrir IndexedDB");
    
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
