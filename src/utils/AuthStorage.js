import { openDB } from "idb";

// 📌 Ouvre la base IndexedDB
async function openDatabase() {
  return openDB("auth-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("tokens")) {
        db.createObjectStore("tokens");
      }
    }
  });
}

// ✅ Enregistrer un token (JWT ou refreshToken)
export async function setToken(key, value) {
  localStorage.setItem(key, value);
  const db = await openDatabase();
  await db.put("tokens", value, key);
}

// ✅ Récupérer un token (avec fallback sur localStorage)
export async function getToken(key) {
  try {
    const db = await openDatabase();
    return (await db.get("tokens", key)) || localStorage.getItem(key) || "";
  } catch (error) {
    console.warn("⚠️ IndexedDB inaccessible, fallback sur LocalStorage.");
    return localStorage.getItem(key) || "";
  }
}

// ✅ Supprimer un token
export async function removeToken(key) {
  localStorage.removeItem(key);
  const db = await openDatabase();
  await db.delete("tokens", key);
}
