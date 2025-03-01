import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import './assets/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { refreshToken } from '@/utils/api.js'; // ✅ Vérifie bien que le chemin est correct

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount('#app'); // ✅ Vérifie que ton index.html contient un élément avec id="app"
let refreshFailed = false; // 🚨 Évite les tentatives inutiles




// 🔄 Vérification et rafraîchissement automatique du JWT toutes les 60 secondes
// ⏳ Vérification et rafraîchissement automatique du JWT toutes les 60 secondes
setInterval(async () => {
  const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  const refreshjwt = localStorage.getItem("refreshjwt");

  if (jwt && refreshjwt) {
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      const expirationTime = payload.exp * 1000;
      const timeLeft = expirationTime - Date.now();

      console.log(`⏳ JWT expire dans ${Math.round(timeLeft / 1000)}s`);

      if (timeLeft < 120000 && Date.now() - (window.lastRefreshAttempt || 0) > 30000) {
        console.log("🔄 Tentative de rafraîchissement du JWT...");
        window.lastRefreshAttempt = Date.now();

        const { newJwt, newRefreshJwt } = await refreshToken();
        if (newJwt) {
          console.log("✅ JWT rafraîchi !");
          localStorage.setItem("jwt", newJwt);
          sessionStorage.setItem("jwt", newJwt);
          if (newRefreshJwt) {
            console.log("🔄 Refresh token mis à jour !");
            localStorage.setItem("refreshjwt", newRefreshJwt);
          }
        }
        
      }
    } catch (error) {
      console.error("❌ Erreur lors de la vérification du JWT :", error);
    }
  }
}, 60000);


// ✅ Vérification de l'authentification au démarrage
(async () => {
  console.log("🔍 Vérification de l'authentification...");
  const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  const refreshjwt = localStorage.getItem("refreshjwt");

  console.log("📦 JWT actuel :", jwt ? "✅ Présent" : "❌ Absent");
  console.log("📦 RefreshToken disponible :", refreshjwt ? "✅ Oui" : "❌ Non");

  if (!jwt && refreshjwt) {
    console.warn("⚠️ Aucun JWT trouvé, tentative de rafraîchissement...");
    try {
      const { newJwt, newRefreshJwt } = await refreshToken(refreshjwt);
      if (newJwt) {
        sessionStorage.setItem("jwt", newJwt);
        if (newRefreshJwt) {
          localStorage.setItem("refreshjwt", newRefreshJwt);
          await updateRefreshTokenInDB(newRefreshJwt); // ✅ Mise à jour dans IndexedDB
        }
      }
      
      else {
        console.error("🚨 Rafraîchissement échoué.");
      }
    } catch (error) {
      console.error("❌ Erreur lors du rafraîchissement :", error);
    }
  }
})();

// ✅ Enregistrement et gestion du Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("✅ Service Worker enregistré !");

      // ✅ Vérifie si une mise à jour est dispo
      registration.onupdatefound = () => {
        const newSW = registration.installing;
        if (newSW) {
          newSW.onstatechange = () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              console.log("🔄 Nouvelle version du SW détectée !");

              // ✅ Demande confirmation avant de mettre à jour
              if (confirm("Une nouvelle version est dispo. Recharger maintenant ?")) {
                newSW.postMessage({ type: "SKIP_WAITING" });
              }
            }
          };
        }
      };

      // ✅ Gestion de la mise à jour automatique
      let refreshing;
      navigator.serviceWorker.addEventListener("controllerchange", async () => {
        if (!refreshing) {
          refreshing = true;
          console.log("🔄 Mise à jour appliquée, vidage du cache...");
          await clearCaches();
          window.location.reload();
        }
      });

    } catch (error) {
      console.error("❌ Erreur lors de l'enregistrement du Service Worker :", error);
    }
  });
}

// ✅ Fonction pour vider le cache du navigateur et du SW
async function clearCaches() {
  console.log("🗑️ Suppression du cache du Service Worker...");
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
      console.log(`🗑️ Cache supprimé : ${name}`);
    }
  }
}
