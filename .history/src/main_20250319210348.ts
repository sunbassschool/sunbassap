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

console.log("🚀 Initialisation de l'application...");
app.mount("#app");
