import { createApp } from "vue";
import "font-awesome/css/font-awesome.min.css";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "./router";
import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// ✅ Gestion du chargement UI
const loadingScreen = document.getElementById("loading-screen");
const appContainer = document.getElementById("app");

// ✅ Fonction pour cacher l'écran de chargement
function finalizeApp() {
  console.log("🎉 Application prête !");
  
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.transition = "opacity 0.5s ease-out";
      loadingScreen.style.opacity = "0";
      setTimeout(() => (loadingScreen.style.display = "none"), 500);
    }

    if (appContainer) {
      appContainer.style.transition = "opacity 0.5s ease-out";
      appContainer.style.opacity = "1";
    }
  }, 500);
}

// ✅ Démarrage de l'application
console.log("🚀 Initialisation de l'application...");
app.mount("#app");
