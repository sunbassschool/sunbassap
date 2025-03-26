import { openDB } from "idb"; // Assure-toi d'avoir installé idb : npm install idb

const DB_NAME = "AuthDB";
const STORE_NAME = "authStore";
const DB_VERSION = 1;

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "key" }); // ✅ Ajout d'un keyPath
                console.log("✅ IndexedDB Object Store 'authStore' créé avec keyPath !");
            }
        }
    });
}


// Récupérer un token depuis IndexedDB
export async function getToken(key) {
    const db = await getDB();
    const token = await db.get(STORE_NAME, key);
    console.log(`🔍 getToken(${key}):`, token);
    return token || null;
}

// Stocker un token dans IndexedDB
export async function setToken(key, value) {
  const db = await getDB();
  await db.put(STORE_NAME, { key, value }); // ✅ Stockage conforme au keyPath
  console.log(`✅ setToken(${key}): enregistré`);
}

// Supprimer un token depuis IndexedDB
export async function removeToken(key) {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
    console.log(`🗑️ removeToken(${key}): supprimé`);
}

// Vérifier si un JWT valide est disponible
export async function getValidToken() {
    let jwt = await getToken("jwt");

    if (!jwt) {
        // Vérifie dans localStorage ou sessionStorage
        jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");

        if (jwt) {
            console.log("🔄 JWT trouvé dans sessionStorage/localStorage, ajout dans IndexedDB !");
            await setToken("jwt", jwt);
        }
    }

    if (jwt && !isTokenExpired(jwt)) {
        console.log("✅ JWT valide trouvé !");
        return jwt;
    }

    console.warn("🚨 JWT expiré ou absent, tentative de refresh...");
    return await refreshToken();
}

// Rafraîchir le token via l'API
// ✅ Assurer que le JWT et le refreshToken sont bien stockés après le refresh
async function refreshToken() {
  console.log("🔄 Rafraîchissement du token en cours...");

  const refreshToken = await getToken("refreshToken");
  if (!refreshToken) {
    console.warn("🚨 Aucun refresh token valide, redirection vers login.");
    return redirectToLogin();
  }

  try {
    const apiBaseURL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec";
    
    const response = await fetch(`${apiBaseURL}?route=refresh&refreshToken=${encodeURIComponent(refreshToken)}&t=${Date.now()}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();
    console.log("🔍 Réponse reçue :", data);

    if (data.status === "success" && data.data.jwt) {
      console.log("✅ Nouveau JWT reçu :", data.data.jwt);

      // ✅ Stocker correctement les tokens
      await setToken("jwt", data.data.jwt);
      sessionStorage.setItem("jwt", data.data.jwt);

      if (data.data.refreshToken) {
        console.log("💾 Refresh Token mis à jour :", data.data.refreshToken);
        await setToken("refreshToken", data.data.refreshToken);
      }

      // ✅ Forcer la mise à jour du JWT en session après refresh
      console.log("🔄 Mise à jour du JWT dans la session...");
      sessionStorage.setItem("jwt", data.data.jwt);
      localStorage.setItem("jwt", data.data.jwt);

      return data.data.jwt;
    } else {
      console.warn("⚠️ Échec du refresh. Réponse API :", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Erreur lors du refresh JWT :", error.message);
    return null;
  }
}
export async function initDB() { // ✅ Ajout de l'export
  return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
              console.log("✅ IndexedDB Object Store 'authStore' créé !");
          }
      }
  });
}
// Vérifier si le token JWT est expiré
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expired = payload.exp * 1000 < Date.now();
        console.log(`⏳ Token expiration check: Expiré = ${expired}`);
        return expired;
    } catch (e) {
        console.warn("⚠️ Token mal formé, considéré comme expiré.");
        return true;
    }
}

// Redirection vers la page de login
function redirectToLogin() {
    console.warn("🔄 Redirection vers login...");
    router.replace("/login");

}
