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
        if (!db.objectStoreNames.contains("jwt")) {
          db.createObjectStore("jwtStore");
        }
        if (!db.objectStoreNames.contains("refreshToken")) {
          db.createObjectStore("refreshTokenStore");
        }
      }
    });
    return db;
  }