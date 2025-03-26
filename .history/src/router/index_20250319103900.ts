import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "@/App.vue";
import router from "@/router/"; // ✅ Routes importées proprement

console.log("🚀 Initialisation de Vue...");

// ✅ Création de l'application
const app = createApp(App);

// ✅ Ajout de Pinia et du router
app.use(createPinia());
app.use(router);

// ✅ Montage immédiat de l'application
app.mount("#app");

console.log("✅ Vue montée !");
