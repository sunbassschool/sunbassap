let dbInstance: IDBPDatabase | null = null;

export async function getAuthDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB("AuthDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("authStore")) {
        db.createObjectStore("authStore", { keyPath: "key" });
        console.log("✅ Object store 'authStore' créé !");
      }
    }
  });