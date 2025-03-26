import { openDB } from 'idb';

const DB_NAME = "SunBassSchool";
const STORE_NAME = "notes";

export async function initDB() {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    }
  });
}

// 🔄 Sauvegarde la note en local (Offline)
export async function saveNoteLocally(note, email) {
  const db = await initDB();
  await db.put(STORE_NAME, { id: email, note, synced: false });
}

// ✅ Récupère la note stockée en local
export async function getLocalNote(email) {
  const db = await initDB();
  return await db.get(STORE_NAME, email);
}

// 🔄 Marquer la note comme synchronisée après envoi API
export async function markNoteSynced(email) {
  const db = await initDB();
  const existing = await db.get(STORE_NAME, email);
  if (existing) {
    await db.put(STORE_NAME, { ...existing, synced: true });
  }
}

// 🚀 Synchronise avec l’API quand l’utilisateur est en ligne
export async function syncNoteWithAPI(apiURL, jwt, email) {
  const localNote = await getLocalNote(email);
  if (localNote && !localNote.synced) {
    try {
      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: "updatenote", jwt, note: localNote.note }),
      });
      const result = await response.json();
      if (result.status === "success") {
        await markNoteSynced(email);
      }
    } catch (error) {
      console.error("❌ Erreur de synchronisation API :", error);
    }
  }
}
