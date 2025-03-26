import { openDB } from "idb";

const DB_NAME = "AuthDB";
const STORE_NAME = "authStore";
const COOKIE_OPTIONS = "Secure; SameSite=Strict; path=/";

/**
 * 🔥 Récupère le refreshToken en vérifiant d'abord les cookies, puis IndexedDB, puis localStorage.
 */
export async function getRefreshToken(): Promise<string | null> {
  // 1️⃣ Vérification des cookies
  const cookies = document.cookie.split("; ");
  const refreshTokenCookie = cookies.find(row => row.startsWith("refreshToken="));
  if (refreshTokenCookie) {
    return refreshTokenCookie.split("=")[1];
  }

  // 2️⃣ Vérification IndexedDB
  const db = await openDB(DB_NAME, 1);
  const tokenEntry = await db.get(STORE_NAME, "refreshToken");
  if (tokenEntry?.value) return tokenEntry.value;

  // 3️⃣ Vérification LocalStorage
  return localStorage.getItem("refreshToken") || null;
}

/**
 * 🔄 Met à jour le refreshToken dans IndexedDB, localStorage et cookies.
 */
export async function setRefreshToken(refreshToken: string) {
  if (!refreshToken) return;

  // Stockage IndexedDB
  const db = await openDB(DB_NAME, 1);
  await db.put(STORE_NAME, { key: "refreshToken", value: refreshToken });

  // Stockage LocalStorage
  localStorage.setItem("refreshToken", refreshToken);

  // Stockage Cookie
  document.cookie = `refreshToken=${refreshToken}; Max-Age=${30 * 24 * 60 * 60}; ${COOKIE_OPTIONS}`;
}

/**
 * 🚨 Supprime le refreshToken de tous les stockages.
 */
export async function clearRefreshToken() {
  // Supprimer IndexedDB
  const db = await openDB(DB_NAME, 1);
  await db.delete(STORE_NAME, "refreshToken");

  // Supprimer LocalStorage
  localStorage.removeItem("refreshToken");

  // Supprimer Cookies
  document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
}

/**
 * 🔥 Récupère le JWT en vérifiant IndexedDB, LocalStorage et SessionStorage.
 */
export async function getJWT(): Promise<string | null> {
  return (
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("jwt") ||
    (await getJWTFromIndexedDB()) ||
    null
  );
}

/**
 * 🗂️ Récupère le JWT depuis IndexedDB.
 */
async function getJWTFromIndexedDB(): Promise<string | null> {
  const db = await openDB(DB_NAME, 1);
  const result = await db.get(STORE_NAME, "jwt");
  return result?.value || null;
}

/**
 * 🔄 Met à jour le JWT dans IndexedDB, localStorage et sessionStorage.
 */
export async function setJWT(jwt: string) {
  if (!jwt) return;

  // Stockage IndexedDB
  const db = await openDB(DB_NAME, 1);
  await db.put(STORE_NAME, { key: "jwt", value: jwt });

  // Stockage LocalStorage & SessionStorage
  localStorage.setItem("jwt", jwt);
  sessionStorage.setItem("jwt", jwt);
}

/**
 * 🚨 Supprime le JWT de tous les stockages.
 */
export async function clearJWT() {
  // Supprimer IndexedDB
  const db = await openDB(DB_NAME, 1);
  await db.delete(STORE_NAME, "jwt");

  // Supprimer LocalStorage & SessionStorage
  localStorage.removeItem("jwt");
  sessionStorage.removeItem("jwt");
}

/**
 * 🔄 Vérifie si le JWT est expiré.
 */
export function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    console.error("❌ Erreur lors du décodage du JWT :", e);
    return true;
  }
}
