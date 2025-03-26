import { createApp } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue"; // ✅ Import absolu
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { verifyIndexedDBSetup } from "@/utils/api.ts";

const app = createApp(App);z
app.use(createPinia());
app.use(router);

// ✅ Éléments UI
const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

// ✅ Fonction pour afficher l'UI après chargement
function finalizeApp() {
  console.log("🎉 Application prête !");
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }
    if (appContainer) {
      appContainer.style.opacity = "1";
    }
  }, 500);
}

// ✅ Vérification IndexedDB avant le lancement
async function initApp() {
  console.log("🚀 Initialisation de l'application...");

  if (!(await verifyIndexedDBSetup())) {
    console.warn("⚠️ IndexedDB non disponible !");
  }

  app.mount("#app");
}

initApp(); // 🔄 Lance l'initialisation
