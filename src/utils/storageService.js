import { openDB } from "idb";
// 📌 Récupération du JWT depuis IndexedDB
export async function getJWTFromIndexedDB() {
    try {
        const db = await openDB("AuthDB", 1);
        const result = await db.get("authStore", "jwt");
        return result?.value ?? null;
    }
    catch (error) {
        console.error("❌ Erreur IndexedDB :", error);
        return null;
    }
}
// 📌 Mise à jour du JWT dans IndexedDB
export async function updateJWTInIndexedDB(jwt) {
    try {
        const db = await openDB("AuthDB", 1);
        await db.put("authStore", { key: "jwt", value: jwt });
        console.log("✅ JWT mis à jour dans IndexedDB !");
    }
    catch (error) {
        console.error("❌ Erreur IndexedDB :", error);
    }
}
// 📌 Récupération du refresh token depuis IndexedDB
export async function getRefreshTokenFromDB() {
    try {
        const db = await openDB("AuthDB", 1);
        const result = await db.get("authStore", "refreshToken");
        return result?.value ?? null;
    }
    catch (error) {
        console.error("❌ Erreur IndexedDB :", error);
        return null;
    }
}
// 📌 Mise à jour du refresh token dans IndexedDB
export async function updateRefreshTokenInDB(refreshToken) {
    try {
        const db = await openDB("AuthDB", 1);
        await db.put("authStore", { key: "refreshToken", value: refreshToken });
        console.log("✅ Refresh token mis à jour dans IndexedDB !");
    }
    catch (error) {
        console.error("❌ Erreur IndexedDB :", error);
    }
}
