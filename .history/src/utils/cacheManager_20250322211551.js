import { checkAndRefreshJWT, getToken } from "@/utils/api.ts"; 
export function getCache(key) {
    return getUserDataCache(key); // ✅ Utilise la même logique que `getUserDataCache`
}
export function setCache(key, data) {
    setUserDataCache(key, data); // ✅ Utilise la même logique que `setUserDataCache`
}

// Plus de suppression automatique après 24h, on met à jour en fonction de l’API
export function getUserDataCache(key) {
    const cachedData = localStorage.getItem(key);

    if (!cachedData) {
        console.log(`🔄 Pas de cache pour ${key}, récupération nécessaire.`);
        return null;
    }

    try {
        return JSON.parse(cachedData);
    } catch (error) {
        console.error("❌ Erreur de parsing du cache :", error);
        return null;
    }
}

// ✅ Au lieu d'effacer, on met à jour le cache uniquement si nécessaire
export async function updateUserDataIfNeeded(key, fetchFromAPI) {
    const cachedData = getUserDataCache(key);

    if (!cachedData) {
        console.log("🚀 Aucune donnée en cache, récupération depuis l'API...");
        const newData = await fetchFromAPI();
        setUserDataCache(key, newData);
        return newData;
    }

    console.log("🔍 Vérification des mises à jour des données utilisateur...");

    try {
        const newData = await fetchFromAPI();

        if (!newData || Object.keys(newData).length === 0) {
            console.warn("⚠️ Données API vides, on conserve le cache actuel.");
            return cachedData; // ✅ Évite d'effacer le cache si l'API ne répond pas bien
        }

        if (JSON.stringify(cachedData) !== JSON.stringify(newData)) {
            console.log("🔄 Données modifiées, mise à jour du cache !");
            setUserDataCache(key, newData);
            return newData;
        } else {
            console.log("✅ Données à jour, pas de mise à jour nécessaire.");
            return cachedData; // ✅ Retourne directement les données en cache
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du cache :", error);
        return cachedData; // ✅ Retourne le cache actuel en cas d'erreur API
    }
}


// ✅ Sauvegarde des données utilisateur dans le cache (sans expiration automatique)
export function setUserDataCache(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`✅ Cache mis à jour pour ${key}`);
}

// ✅ Vérifie si l'utilisateur est connecté et rafraîchit le JWT si nécessaire
export async function checkUserSession() {
    console.log("🔍 Vérification de la session utilisateur...");

    const jwt = await getValidToken();

    if (!jwt) {
        console.warn("🚨 Aucun JWT trouvé, tentative de refresh...");
        await checkAndRefreshJWT(); // 🔄 Essaye de rafraîchir immédiatement le JWT
        return;
    }

    try {
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        const expiresIn = (payload.exp * 1000) - Date.now();

        console.log(`⏳ JWT expire dans ${Math.round(expiresIn / 1000)} secondes`);

        if (expiresIn < 120000) {
            console.log("🔄 Token expirant sous peu, tentative de refresh...");
            await checkAndRefreshJWT();
        }
    } catch (e) {
        console.error("❌ Erreur lors de la vérification du JWT :", e);
        await checkAndRefreshJWT();
    }
}

export function clearCache(key) {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_expiration`);
    console.log(`🗑️ Cache utilisateur supprimé pour ${key}`);
}
export function shouldUpdateCache(key, newData) {
    const cachedData = getUserDataCache(key);

    if (!cachedData) return true; // ✅ Si aucun cache, on met à jour

    return JSON.stringify(cachedData) !== JSON.stringify(newData);
}
export function clearUserCacheIfNeeded() {
    const currentUserEmail = localStorage.getItem("email");
    const cachedUserEmail = localStorage.getItem("cachedUserEmail"); 

    if (cachedUserEmail !== currentUserEmail) {
        console.warn("⚠️ Changement d'utilisateur détecté, réinitialisation du cache...");

        // 🔄 Supprime les anciennes données
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("userData_") || key.startsWith("planning_")) {
                localStorage.removeItem(key);
            }
        });

        // ✅ Met à jour l'utilisateur en cache
        localStorage.setItem("cachedUserEmail", currentUserEmail);
    }
}
