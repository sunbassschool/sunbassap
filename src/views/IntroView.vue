<template>
  <div class="intro-container">
    <!-- Logo en haut de la page -->
    <div v-if="!showModal" class="logo-container">
      <img src="/images/logo.png"
           alt="SunBassSchool Logo" 
           class="logo" />
    </div>

    <!-- Spinner de chargement -->
    <div v-if="!showModal" class="d-flex justify-content-center align-items-center" style="height: calc(100vh - 120px);">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Fenêtre d'intro (visible après l'animation de chargement) -->
   <transition name="fade" appear>

      <div v-if="showModal" class="intro-box text-center p-4">
        <h1 class="title mb-3">Bienvenue sur <span class="highlight">SunBassSchool</span></h1>
        <p class="subtitle mb-4">Prépare-toi à plonger dans l'univers de la basse 🎸</p>
        <button class="btn btn-primary btn-lg start-button" @click="goToDashboard">
          <i class="bi bi-play-circle-fill me-2"></i>Commencer
        </button>
      </div>
    </transition>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { openDB } from "idb";

const showModal = ref(false);
const isProcessing = ref(false);
const router = useRouter();

// ✅ Initialisation propre d'IndexedDB
const initDB = async () => {
  return openDB("auth-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("tokens")) {
        db.createObjectStore("tokens");
      }
    }
  });
};

// ✅ Récupération du refresh token (priorité à sessionStorage)
const getRefreshToken = async () => {
  try {
    const db = await initDB();
    const tokenDB = await db.get("tokens", "refreshToken");
    const tokenSession = sessionStorage.getItem("refreshjwt");
    const tokenLocal = localStorage.getItem("refreshjwt");

    return tokenSession || tokenDB || tokenLocal || "";
  } catch (error) {
    console.error("❌ Erreur IndexedDB :", error);
    return sessionStorage.getItem("refreshjwt") || localStorage.getItem("refreshjwt") || "";
  }
};

// ✅ Stockage du refresh token
const saveRefreshToken = async (refreshToken) => {
  try {
    const db = await initDB();
    await db.put("tokens", refreshToken, "refreshToken");

    sessionStorage.setItem("refreshjwt", refreshToken);
    localStorage.setItem("refreshjwt", refreshToken);
    
    console.log("💾 Refresh token stocké :", refreshToken);
  } catch (error) {
    console.error("❌ Erreur en sauvegardant le refresh token :", error);
  }
};

// ✅ Mise en cache du JWT
const cacheJWT = async (jwt) => {
  try {
    const db = await initDB();
    await db.put("tokens", jwt, "jwt");

    sessionStorage.setItem("jwt", jwt);
  } catch (error) {
    console.error("❌ Erreur lors de la mise en cache du JWT :", error);
  }
};

// ✅ Récupération du JWT en cache (sessionStorage prioritaire)
const getCachedJWT = async () => {
  try {
    const db = await initDB();
    const jwtSession = sessionStorage.getItem("jwt");
    const jwtDB = await db.get("tokens", "jwt");

    return jwtSession || jwtDB || null;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du JWT depuis le cache :", error);
    return sessionStorage.getItem("jwt") || null;
  }
};

// ✅ Vérification de la validité du JWT avant appel API
const isJWTValid = (jwt) => {
  try {
    if (!jwt || jwt.split(".").length < 3) return false;
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du JWT :", error);
    return false;
  }
};

// ✅ Vérification et rafraîchissement du JWT
const refreshToken = async (refreshjwt) => {
  if (!refreshjwt || isProcessing.value) {
    console.log("🚨 Aucun refresh token trouvé ou requête en cours.");
    setTimeout(() => (showModal.value = true), 1000);
    return;
  }

  isProcessing.value = true;

  try {
    const cachedJWT = await getCachedJWT();
    if (isJWTValid(cachedJWT)) {
      console.log("✅ JWT valide trouvé en cache !");
      sessionStorage.setItem("jwt", cachedJWT);
      isProcessing.value = false; 
      router.push("/mon-espace");
      return;
    }

    console.log("🚀 Aucun JWT valide en cache, appel API...");

    const apiBaseURL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxXdhJygQVZuJsUaEbW8nuh_U3CTg-piJTJ7L2tUc2UKvE89nnrTz0bSPGJjaehvL36aQ/exec";
    
    const response = await fetch(`${apiBaseURL}?route=refresh&refreshToken=${encodeURIComponent(refreshjwt)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error("Erreur lors de la conversion JSON de la réponse API.");
    }

    if (data.status === "success" && data.data.jwt && typeof data.data.jwt === "string") {
      console.log("✅ Nouveau JWT récupéré !");
      await cacheJWT(data.data.jwt);

      if (data.data.refreshToken) {
        await saveRefreshToken(data.data.refreshToken);
      }

      setTimeout(() => router.push("/mon-espace"), 500);
    } else {
      console.warn("⚠️ Échec du refresh.", data);
      setTimeout(() => (showModal.value = true), 500);
    }
  } catch (error) {
    console.error("❌ Erreur lors du refresh JWT :", error.message);
    setTimeout(() => (showModal.value = true), 500);
  } finally {
    isProcessing.value = false;
  }
};


// ✅ Vérification du refresh token au démarrage
onMounted(async () => {
  const refreshjwt = await getRefreshToken();
  const cachedJWT = await getCachedJWT();

  if (isJWTValid(cachedJWT)) {
    console.log("✅ JWT valide trouvé en cache !");
    sessionStorage.setItem("jwt", cachedJWT);
    router.push("/mon-espace");
    return;
  }

  if (!refreshjwt) {
    console.warn("⚠️ Aucun refresh token disponible.");
    setTimeout(() => (showModal.value = true), 1000);
    return;
  }

  console.log("🚀 Tentative de refresh...");
  await refreshToken(refreshjwt);
});

// ✅ Redirection manuelle au dashboard
const goToDashboard = () => {
  showModal.value = false;
  setTimeout(() => {
    router.push("/mon-espace");
  }, 500);
};
</script>





<style scoped>
/* ✅ Fond et affichage plein écran */
.intro-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom left,rgb(17, 9, 9),rgb(0, 0, 0));
}

/* ✅ Conteneur du logo */
.logo-container {
  margin-bottom: 40px; /* Espacement entre le logo et le spinner */
}

/* ✅ Style du logo */
.logo {
  margin-top: 200px;
  width: 100px; /* Taille du logo (ajuste selon ta préférence) */
  height: auto;
}

/* ✅ Spinner de chargement */
.loading-container {
  position: fixed;  /* Rend le loader toujours visible */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);  /* Centre parfaitement */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8); /* Fond légèrement opaque pour la visibilité */
  z-index: 1000; /* Assure que le loader passe au-dessus */
}

.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}

/* ✅ Fenêtre d'intro avec effet de verre */
.intro-box {
  width: 450px;
  padding: 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 10px 40px rgba(0, 0, 0, 0.6);
  text-align: center;
}

/* ✅ Style du texte */
.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
}

.highlight {
  color:rgb(250, 96, 96);
}

.subtitle {
  font-size: 1.2rem;
  color: #d1d5db;
  margin-top: 10px;
}

/* ✅ Bouton "Commencer" */
.start-button {
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  background:rgb(250, 96, 96);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.start-button:hover {
  background:rgb(207, 0, 0);
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(255, 0, 0, 0.5);
}

/* ✅ Animation de fondu améliorée */
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s ease-in-out;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to {
  opacity: 1;
}
</style>
