declare global {
    interface Window {
      latestJWT?: string;
    }
  }
  
  import { openDB } from "idb";
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
  // Priorité : localStorage > sessionStorage > IndexedDB > cookies
  let token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  if (!token) {
    token = await getJWTFromIndexedDB();  // Appel à IndexedDB si le token n'est pas dans les stockages locaux
  }

  if (!token) {
    const cookieToken = document.cookie.split("; ").find(row => row.startsWith("jwt="))?.split("=")[1];
    if (cookieToken) {
      token = cookieToken;
    }
  }

  return token || null;  // Retourne null si aucun token trouvé
}
// Fonction pour récupérer le JWT depuis IndexedDB
export async function getJWTFromIndexedDB(): Promise<string | null> {
  await verifyIndexedDBSetup();  // Vérification si IndexedDB est disponible

  try {
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readonly");
    const store = tx.objectStore("authStore");
    const result = await store.get("jwt");

    return result?.value || null;  // Retourne le JWT ou null si non trouvé
  } catch (error) {
    console.error("❌ Erreur lors de l'accès à IndexedDB pour récupérer le JWT :", error);
    return null;
  }
}

// Vérifie et rafraîchit le JWT au réveil de l'application (quand l'application revient en premier plan)
export async function checkAndRefreshOnWakeUp() {
  console.log("⏰ Vérification du refresh au réveil...");

  const now = Date.now();
  const lastRefresh = Number(localStorage.getItem("lastRefreshTime")) || 0;

  // Si le refresh a été effectué récemment (moins de 5 minutes), on attend
  if (now - lastRefresh < 5 * 60 * 1000) {
    console.log("🛑 Refresh déjà fait récemment, on attend.");
    return;
  }

  // Récupère la date d'expiration du refreshToken depuis localStorage
  let expirationTime = Number(localStorage.getItem("refreshTokenExpiration") || 0);

  // Corrige une expiration invalide (ex: date de 1970)
  if (expirationTime < 10000000000) { 
    console.warn("⚠️ Expiration du refresh token invalide, on le remet à 7 jours");
    expirationTime = now + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("refreshTokenExpiration", expirationTime.toString());
  }

  console.log("🔍 Expiration enregistrée :", new Date(expirationTime).toLocaleString());
  console.log("🕒 Heure actuelle :", new Date(now).toLocaleString());
  console.log("📌 Différence (sec) :", (expirationTime - now) / 1000);

  // Si le refreshToken expire dans moins de 2 minutes, on tente de le rafraîchir
  if (expirationTime - now < 2 * 60 * 1000) {
    console.warn("⏳ Refresh token presque expiré, tentative de refresh...");

    // Récupère le refreshToken depuis IndexedDB ou localStorage
    const storedRefreshToken = await getRefreshTokenFromDB() || localStorage.getItem("refreshToken");
    console.log("📌 Refresh token récupéré depuis :", storedRefreshToken ? "OK" : "AUCUN TOKEN TROUVÉ !");

    if (!storedRefreshToken) {
      console.warn("❌ Aucun refresh token disponible, arrêt du refresh.");
      return;
    }

    // Rafraîchit le JWT
    const newJwt = await refreshToken();

    if (!newJwt) {
      console.warn("❌ Échec du refresh token, arrêt.");
      return;
    }

    // Enregistre la dernière heure de refresh
    localStorage.setItem("lastRefreshTime", now.toString());
  } else {
    console.log("✅ Refresh token encore valide.");
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
  console.log("🔄 Vérification et restauration des tokens dans IndexedDB...");

  // Vérification que IndexedDB est bien disponible
  const indexedDBAvailable = await verifyIndexedDBSetup();
  if (!indexedDBAvailable) {
    console.warn("❌ Impossible d'utiliser IndexedDB.");
    return;
  }

  // Récupération du JWT et du refreshToken depuis localStorage ou sessionStorage
  const storedJwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
  const storedRefreshToken = localStorage.getItem("refreshToken");

  // Si le JWT est trouvé, on le restaure dans IndexedDB
  if (storedJwt) {
    console.log("📥 Restauration du JWT dans IndexedDB...");
    await updateJWTInIndexedDB(storedJwt);  // Assure-toi que la fonction `updateJWTInIndexedDB` existe
  }

  // Si le refreshToken est trouvé, on le restaure dans IndexedDB
  if (storedRefreshToken) {
    console.log("📥 Restauration du refreshToken dans IndexedDB...");
    await updateRefreshTokenInDB(storedRefreshToken);  // Assure-toi que la fonction `updateRefreshTokenInDB` existe
  }

  console.log("✅ IndexedDB restauré avec les tokens !");
}
// Fonction pour définir les cookies pour le JWT et le refreshToken
export function setTokenCookies(jwt: string | undefined, refreshToken: string | undefined) {
  if (!refreshToken) return; // Sécurité : ne pas créer un cookie vide

  const maxAge = 30 * 24 * 60 * 60; // 30 jours en secondes (30 jours * 24h * 60min * 60s)

  // Définir le cookie pour le JWT
  if (jwt) {
    document.cookie = `jwt=${jwt}; Max-Age=${maxAge}; Secure; SameSite=Strict; path=/`;
    console.log("✅ Cookie JWT défini avec expiration longue !");
  }

  // Définir le cookie pour le refreshToken
  document.cookie = `refreshToken=${refreshToken}; Max-Age=${maxAge}; Secure; SameSite=Strict; path=/`;
  console.log("✅ Cookie Refresh Token défini avec expiration longue !");
}

// Fonction pour vérifier si le JWT a expiré
export function isJwtExpired(token: string): boolean {
  try {
    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded.exp * 1000 < Date.now();  // Vérifie si la date d'expiration est passée
  } catch (error) {
    console.error("❌ Erreur lors du décodage du JWT :", error);
    return true;  // Si une erreur survient, on considère que le JWT est expiré
  }
}

// Vérifie et restaure les tokens depuis les différents stockages
export async function checkAndRestoreTokens() {
  console.log("🔄 Vérification des tokens...");

  // On récupère les tokens depuis les différents stockages
  let jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  let refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");

  // Si le JWT ou le refreshToken sont manquants ou expirés
  if (!jwt || isJwtExpired(jwt)) {
    console.warn("🚨 JWT manquant ou expiré, tentative de restauration...");

    // Tentative de récupérer le refreshToken depuis IndexedDB ou cookies
    refreshToken = await getRefreshTokenFromDB();

    if (!refreshToken) {
      console.warn("❌ Aucun refreshToken trouvé, l'utilisateur risque d'être déconnecté.");
      return;
    }

    // Restauration des tokens
    if (!localStorage.getItem("refreshToken")) {
      localStorage.setItem("refreshToken", refreshToken);
      console.log("📦 Refresh token restauré dans LocalStorage.");
    }

    if (!sessionStorage.getItem("refreshToken")) {
      sessionStorage.setItem("refreshToken", refreshToken);
      console.log("📦 Refresh token restauré dans SessionStorage.");
    }

    // Si le refreshToken n'est pas dans les cookies, on l'ajoute
    const cookieToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1];
    if (!cookieToken) {
      document.cookie = `refreshToken=${refreshToken}; Secure; SameSite=Strict; path=/`;
      console.log("🍪 Refresh token restauré dans les cookies.");
    }

    // Une fois le refreshToken restauré, on peut tenter de rafraîchir le JWT
    const newJwt = await refreshToken();
    if (!newJwt) {
      console.error("❌ Impossible de restaurer le JWT, l'utilisateur devra se reconnecter.");
      return;
    }

    console.log("✅ Tokens restaurés avec succès.");
  } else {
    console.log("✅ JWT valide, aucun rafraîchissement nécessaire.");
  }
}

  // Fonction centralisée pour interagir avec les différents stockages (localStorage, sessionStorage, cookies, IndexedDB)
  const storageManager = {
    async getTokenFromAllStorages(key: string): Promise<string | null> {
      const storedToken = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (storedToken) return storedToken;
  
      const dbToken = await getTokenFromIndexedDB(key);  // À définir plus tard
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
  
  export async function getRefreshTokenFromDB() {
    console.log("🔄 Récupération du refresh token...");
    let refreshToken = await storageManager.getTokenFromAllStorages("refreshToken");
    if (!refreshToken) {
      console.error("🚨 Aucun refresh token trouvé !");
    }
    return refreshToken;
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
export async function preventIndexedDBCleanup() {
  console.log("🛡️ Protection contre la suppression d'IndexedDB...");

  // Ouverture de la base de données IndexedDB
  const db = await openDB("AuthDB", 1);
  const tx = db.transaction("authStore", "readwrite");
  const store = tx.objectStore("authStore");

  // Inscription d'une clé spéciale pour maintenir IndexedDB en vie
  await store.put({ key: "keepAlive", value: Date.now() });

  setTimeout(preventIndexedDBCleanup, 24 * 60 * 60 * 1000); // Appel toutes les 24 heures pour prévenir le nettoyage
}

  // Fonction de rafraîchissement du JWT
export async function refreshToken(): Promise<string> {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.warn("⛔ Trop de tentatives de refresh, on arrête.");
      await handleRefreshFailure();
      return ""; // Retourne une chaîne vide pour indiquer l'échec
    }
  
    console.log("🔄 Tentative de rafraîchissement du JWT...");
  
    let storedRefreshToken = await getRefreshTokenFromDB();
    if (!storedRefreshToken) {
      console.warn("⚠️ Aucun refresh token disponible.");
      await handleRefreshFailure();
      return "";
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
      return "";
    }
  }
  // Fonction pour mettre à jour les tokens dans tous les stockages
export async function updateTokens(newJwt: string, newRefreshToken: string) {
    if (!newJwt || !newRefreshToken) return;
  
    console.log("🔄 Mise à jour des tokens...");
  
    // Mettre à jour les tokens dans tous les stockages
    storageManager.setTokenInAllStorages("jwt", newJwt);
    storageManager.setTokenInAllStorages("refreshToken", newRefreshToken);
  
    const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
    localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());
  
    // Enregistrer dans IndexedDB
    await updateJWTInIndexedDB(newJwt);
    await updateRefreshTokenInDB(newRefreshToken);
  
    console.log("✅ Tokens mis à jour partout !");
  }
  
  // Mise à jour du JWT dans IndexedDB
  export async function updateJWTInIndexedDB(newJwt: string) {
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
  
  // Mise à jour du refresh token dans IndexedDB
  export async function updateRefreshTokenInDB(newRefreshToken: string) {
    if (!newRefreshToken) return;
  
    console.log("🔍 Sauvegarde du refresh token dans IndexedDB...");
  
    await verifyIndexedDBSetup(); 
  
    const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours
  
    const db = await openDB("AuthDB", 1);
    const tx = db.transaction("authStore", "readwrite");
    const store = tx.objectStore("authStore");
  
    await store.put({ key: "refreshToken", value: newRefreshToken });
    await store.put({ key: "refreshTokenExpiration", value: newExpirationTime });
  
    console.log("✅ Refresh token stocké dans IndexedDB :", newRefreshToken);
  
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("refreshTokenExpiration", newExpirationTime.toString());
    sessionStorage.setItem("refreshToken", newRefreshToken);
  
    console.log("✅ Nouveau refresh token stocké sur l'app :", newRefreshToken);
  }
  // Fonction pour gérer l’échec de rafraîchissement du token
export async function handleRefreshFailure() {
    console.error("🚨 Refresh token invalide ou expiré. Déconnexion forcée...");
    alert("⚠️ Votre session a expiré, veuillez vous reconnecter.");
    await clearUserData();
    console.warn("🛑 Tokens corrompus détectés, suppression forcée !");
  
    setTimeout(() => {
      window.location.href = import.meta.env.MODE === "production" ? "/app/login" : "/login";
    }, 500);
    return Promise.reject("Déconnexion forcée, veuillez vous reconnecter.");
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

  const token = await getToken();
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
    await logout();
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
    const cookieToken = document.cookie.split("; ").find(row => row.startsWith("refreshToken="))?.split("=")[1];

    if (!dbToken && !localToken && !cookieToken) {
      console.error("🚨 AUCUN refresh token trouvé ! Reset obligatoire !");
      return;
    }

    // Correction d’incohérence
    if (dbToken && localToken && cookieToken && (dbToken !== localToken || dbToken !== cookieToken)) {
      console.warn("⚠️ Incohérence détectée entre Cookies, IndexedDB et LocalStorage. Correction...");
    
      const validToken =
        (dbToken && localToken)
          ? (dbToken.length > localToken.length ? dbToken : localToken)
          : dbToken || localToken || "";
    
      if (validToken) {
        storageManager.setTokenInAllStorages("refreshToken", validToken);
        await updateRefreshTokenInDB(validToken);
      } else {
        console.warn("⚠️ Aucun token valide trouvé, stockage annulé.");
      }
    }
  } catch (error) {
    console.error("❌ Erreur de synchronisation :", error);
  }

  isSyncing = false;
}
export async function logoutUser() {
  console.log("🚨 Déconnexion en cours...");

  try {
    // Bloque immédiatement tout refresh en cours
    if (typeof refreshInProgress !== "undefined") {
      refreshInProgress = Promise.resolve(null);
    }

    // Supprime tous les cookies (compatibilité)
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "") // Supprime les espaces au début
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"); // Expiration forcée
    });

    console.log("🗑️ Cookies supprimés !");

    // Supprime les données dans IndexedDB
    await clearIndexedDBData();

    // Supprime tous les tokens stockés
    await Promise.all([ 
      sessionStorage.clear(),
      localStorage.removeItem("jwt"),
      localStorage.removeItem("refreshToken"),
      localStorage.removeItem("prenom")
    ]);

    console.log("✅ Données utilisateur nettoyées !");

    // Déclenche un événement pour informer les autres composants
    window.dispatchEvent(new Event("logout"));

    // Redirection après une courte pause
    setTimeout(() => {
      console.log("🔄 Redirection vers la page de connexion...");
      window.location.href = "/login";
    }, 300);

    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
    return false;
  }
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
