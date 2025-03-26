<template>
  <Layout>
    <div class="container d-flex justify-content-center align-items-center mt-5">
      <div class="row justify-content-center w-200">
        <div class="w-100 mx-auto">
          <div class="card shadow p-5">
       <h2 class="h2-immersive">🚀 Se connecter</h2>


       <form v-if="!loading && !isLoggedIn" @submit.prevent="login">

              <div class="mb-3">
                <label for="email" class="form-label">Adresse e-mail</label>
                <input 
  v-model="email" 
  type="email" 
  id="email"
  name="email" 
  class="form-control" 
  required 
  autocomplete="off"
  spellcheck="false"
  pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
  title="Veuillez entrer une adresse e-mail valide">


              </div><p v-if="email && !isValidEmail(email)" class="text-danger">
  ⚠️ Adresse e-mail invalide !
</p>

              <div class="mb-3">
                <label for="password" class="form-label">Mot de passe</label>
                <input 
                  v-model="password" 
                  type="password" 
                  id="password" 
                  name="password"
                  class="form-control" 
                  required 
                  autocomplete="new-password"
                  spellcheck="false">
              </div>

              <input type="password"   name="password2"
              style="display:none" autocomplete="new-password">

              <button type="submit" :disabled="loading || !isValidEmail(email)" class="btn btn-primary w-100">

                <span v-if="!loading">GO !</span>
                <span v-else>Connexion en cours...</span>
              </button>
              <div class="text-center mt-3">
  <router-link to="/forgot-password" class="forgot-password-link">
    J'ai oublié mon mot de passe
  </router-link>
</div>

            </form>

            <!-- Barre de chargement animée avec progression dynamique -->
            <div v-if="loading" class="loading-container mt-3">
              <div class="loading-bar" :style="{ width: progress + '%' }"></div>
            </div>

            <div v-if="message" class="alert mt-3" :class="messageType">{{ message }}</div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>
<script>
import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode";
import * as api from '@/utils/api';
import {verifyIndexedDBSetup, checkAndRestoreTokens, storeUserInfo, restoreUserInfo    } from '@/utils/api.ts';

export default {
  name: "Login",
  components: { Layout },

  data() {
    return {
      emailTouched: false, 
      email: localStorage.getItem("email") || sessionStorage.getItem("email") || "", 
      password: "",
      message: "",
      messageType: "",
      isLoggedIn: false,
      jwt: "",
      refreshToken: "",
      apiBaseURL: "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec",
      loading: false,
      progress: 0,
      progressInterval: null,
      tokenCheckInterval: null,
      isRefreshing: false
    }; // ✅ POINT-VIRGULE ICI POUR FERMER
  },

  computed: {
    prenom() {
      return localStorage.getItem("prenom") || sessionStorage.getItem("prenom") || "";
    },
  },

  async mounted() {
  console.log("📌 Initialisation de Login.vue...");

  try {
    await verifyIndexedDBSetup();
    await checkAndRestoreTokens();
    await api.restoreUserInfo(); // 🔥 Restaure les infos utilisateur perdues
  } catch (error) {
    console.error("❌ Problème avec IndexedDB ou tokens :", error);
  }

  this.isLoggedIn = await this.checkLoginStatus();

  if (this.isLoggedIn) {
    console.log("✅ Utilisateur déjà connecté !");
    return this.redirectUser();
  }

  console.warn("⚠️ Aucun JWT valide, affichage du formulaire de connexion.");
}


,

  beforeUnmount() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  },

  methods: {
    async checkLoginStatus() {
      const jwt = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
if (!jwt) return false;

try {
  const decoded = jwtDecode(jwt);
  return decoded.exp * 1000 > Date.now();
} catch (error) {
  console.error("🚨 JWT invalide :", error);
  return false;
}

    },


    redirectUser() {
      this.$router.push("/dashboard");
    },

    async sha256(text) {
      const buffer = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    },

    isValidEmail(email) {
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    },

    async login() {
  if (!this.email || !this.password) {
    return this.setMessage("Veuillez remplir tous les champs.", "alert-danger");
  }

  console.clear();
  console.time("Total Login Time");
  await api.clearUserData();
  this.loading = true;
  this.progress = 0;

  // ✅ Simulation d'un chargement progressif
  this.progressInterval = setInterval(() => {
    if (this.progress < 85) {
      this.progress += Math.random() * 10; // Augmente de manière aléatoire jusqu'à 85%
    }
  }, 500); // Toutes les 500ms

  try {
    console.log("📡 Envoi de la requête de connexion...");
    const response = await fetch(`${this.apiBaseURL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: "login",
        email: this.email,
        password: await this.sha256(this.password),
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "success" || !data.data.jwt) {
      console.warn("⚠️ Réponse API invalide :", data);
      this.setMessage(`❌ ${data.message || "Erreur de connexion."}`, "alert-danger");
      this.loading = false;
      clearInterval(this.progressInterval);
      return;
    }

    console.log("✅ Connexion réussie !");
    await this.storeSession(data.data);

    // ✅ Complète la barre à 100% avant la redirection
    this.progress = 100;
    setTimeout(() => {
      clearInterval(this.progressInterval);
      const userRole = localStorage.getItem("role") || sessionStorage.getItem("role");
      if (userRole === "admin") {
        this.$router.push("/cours");
      } else if (userRole === "eleve_trimestriel") {
        this.$router.push("/if (localStorage.getItem("session_expired") === "true") {
    console.warn("🚨 La session a expiré, arrêt de la récupération des tokens.");
    return;
  }");
      } else {
        this.$router.push("/mon-espace");
      }
    }, 500);
  } catch (error) {
    console.error("🚨 Erreur lors de la connexion :", error);
    this.setMessage("❌ Erreur serveur, veuillez réessayer plus tard.", "alert-danger");
    this.loading = false;
    clearInterval(this.progressInterval);
  }
}
,

async storeSession(data) {
  console.log("🔥 storeSession() appelé !");

  if (!data.jwt || !data.refreshToken) { 
    console.warn("🚨 JWT ou Refresh Token manquant !");
    return;
  }

  try {
    const decoded = jwtDecode(data.jwt);
    console.log("🎫 JWT décodé :", decoded);

    if (!decoded.exp || decoded.exp * 1000 < Date.now()) {
      console.warn("🚨 JWT expiré reçu, rejeté.");
      return;
    }

    const userRole = decoded.role || decoded.userRole || decoded["https://yourdomain.com/role"];
    console.log("🎯 Rôle détecté :", userRole);

    // ✅ Stocker les données utilisateur
    const userData = {
      prenom: decoded.prenom || "Utilisateur", // 🔥 Remplace par la clé correcte dans ton JWT
      email: decoded.email || ""
    };

    await api.storeUserInfo(userData);

    localStorage.setItem("role", userRole);
    sessionStorage.setItem("role", userRole);
    localStorage.setItem("jwt", data.jwt);
    sessionStorage.setItem("jwt", data.jwt);
    localStorage.setItem("refreshToken", data.refreshToken);
    sessionStorage.setItem("refreshToken", data.refreshToken);

    document.cookie = `jwt=${data.jwt}; Secure; SameSite=Strict; path=/`;
    document.cookie = `refreshToken=${data.refreshToken}; Secure; SameSite=Strict; path=/`;

    await api.updateTokens(data.jwt, data.refreshToken);
    console.log("✅ Données sauvegardées !");
  } catch (error) {
    console.error("🚨 Erreur lors du décodage du JWT :", error);
  }
}




,

    setMessage(msg, type) {
      this.message = msg;
      this.messageType = type;
    }
  }
};
</script>






<style scoped>
.container
{text-align:center;}
.h2-immersive {
  font-weight: bold;
    animation: fadeIn 1.2s ease-in-out;
   /* Empêche le retour à la ligne */
  text-transform: uppercase; /* Force les majuscules */
  white-space: nowrap; /* Empêche le retour à la ligne */

  text-align: center;
  font-size: 1rem;
  background: linear-gradient(135deg,rgb(255, 255, 255),rgb(172, 172, 172));
  -webkit-background-clip: text;
  color: transparent; /* Texte en dégradé */
  text-shadow: 0px 4px 10px rgba(126, 126, 126, 0.5);
  padding: 10px;
  border-radius: 8px;
  display: inline-block;
  transition: transform 0.2s ease-in-out;
}
@media (max-width: 576px) { /* Ajuste sur mobiles */
  .h2-immersive {
    font-size: 1.5rem;
  }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.h2-immersive:hover {
  transform: scale(1.05); /* Effet zoom léger */
}

.container {
  max-width: 90% !important; /* S'étend à 90% de l’écran */
  width: 100%;
}

.loading-container {
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.loading-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff8c00, #ff5e00);
  transition: width 0.3s ease-in-out;
  border-radius: 2px;
}


.card {
  border-radius: 12px;
  max-width: 150%;
  width: 100%;
  background: rgba(255, 255, 255, 0.1); /* Légère transparence */
  backdrop-filter: blur(10px); /* Effet de flou pour un look moderne */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  padding: 30px;
  color: #fff;
}

.card h2 {
  font-weight: bold;
  color: #fff; /* Blanc pour fond sombre */
  text-align: center;
}

input {
  border-radius: 0px; /* Suppression des angles arrondis */
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  color: black;
  border: 1px solid rgba(200, 200, 200, 0.5); /* Bordure plus discrète */
  padding: 8px; /* Réduction de l’espace interne */
  font-size: 0.9rem; /* Réduction de la taille du texte */
  height: 36px; /* Hauteur plus compacte */
}

input:focus {
  border-color: #ff8c00;
  box-shadow: none; /* Supprime l’effet de focus flou */
}

.form-label {
  font-weight: bold;
  color: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #ff8c00, #ff5e00);
  border: none;
  font-weight: bold;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 1rem;
  text-transform: uppercase;
  transition: all 0.3s ease-in-out;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  transform: scale(1.05);
}

.btn-primary:active {
  transform: scale(0.98);
}



.forgot-password-link {
  color: #ff8c00;
  font-weight: bold;
  text-decoration: none;
}

.forgot-password-link:hover {
  text-decoration: underline;
}

/* Effet focus animé */
@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 140, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 140, 0, 0.5); }
}

input:focus {
  animation: glow 1s infinite alternate;
}

/* Ajustement global */
.container {
  margin-top: 50px;
}

/* Empêcher Chrome de stocker les mots de passe */
input:-webkit-autofill {
  background-color: transparent !important;
}

</style>
