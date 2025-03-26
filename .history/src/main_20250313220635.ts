import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "@/store/authStore"; // Import du store auth

import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { checkAndRefreshOnWakeUp } from "@/utils/api.ts";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// ✅ Initialisation de l'authentification via Pinia
const authStore = useAuthStore();
authStore.initializeAuth(); // Laisse Pinia gérer la synchro des tokens

app.mount("#app");

// ✅ Vérification des tokens seulement toutes les 60 secondes max
let lastVisibilityCheck = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - lastVisibilityCheck < 60_000) return;

  lastVisibilityCheck = Date.now();
  console.log("🔄 Vérification des tokens...");
  await checkAndRefreshOnWakeUp();
});
