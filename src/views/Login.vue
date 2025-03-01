<template>
  <Layout>
    <div class="container d-flex justify-content-center align-items-center mt-5">
      <div class="row justify-content-center w-200">
        <div class="w-100 mx-auto">
          <div class="card shadow p-5">
       <h2 class="h2-immersive">🚀 Se connecter</h2>


            <form v-if="!loading" @submit.prevent="login">
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
                  spellcheck="false">
              </div>

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

              <button type="submit" :disabled="loading" class="btn btn-primary w-100">
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
import { setToken, getToken, removeToken } from "@/utils/authStorage";

export default {
  name: "Login",
  components: { Layout },
  data() {
    return {
      email: "",
      password: "",
      message: "",
      messageType: "",
      jwt: "",
      refreshjwt: "",
      apiBaseURL: "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec",
      loading: false,
      isLoading: false,
      progress: 0,
      progressInterval: null,
      tokenCheckInterval: null,
    };
  },
  computed: {
    prenom() {
      return sessionStorage.getItem("prenom") || "";
    }
  },
  async mounted() {
    console.log("✅ Vérification du JWT au chargement...");

    await this.tryCatchWrapper(async () => {
      [this.jwt, this.refreshjwt] = await Promise.all([getToken("jwt"), getToken("refreshjwt")]);

      if (this.jwt) {
        this.decodeJWT(this.jwt);
        this.checkTokenExpiration();
      } else if (this.refreshjwt) {
        console.log("🔄 Aucun JWT, tentative de rafraîchissement...");
        await this.refreshToken();
      }
    }, "Erreur lors de la récupération des tokens.");

    this.tokenCheckInterval = setInterval(() => this.checkTokenExpiration(), 5 * 60 * 1000);
  },
  beforeUnmount() {
    clearInterval(this.tokenCheckInterval);
  },
  methods: {
    async sha256(text) {
      const buffer = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    },

    async tryCatchWrapper(fn, errorMessage) {
      try {
        return await fn();
      } catch (error) {
        console.error(`🚨 ${errorMessage}`, error);
        this.setMessage(errorMessage, "alert-danger");
      }
    },

    checkTokenExpiration() {
      if (!this.jwt) return;

      try {
        const payload = jwtDecode(this.jwt);
        const expirationTime = payload.exp * 1000;
        const timeLeft = expirationTime - Date.now();

        if (timeLeft < 60 * 1000) { // Avant : 2 minutes
  console.log("🔄 JWT presque expiré, tentative de rafraîchissement...");
  setTimeout(() => this.refreshToken(), 500);
}

      } catch (error) {
        console.error("🚨 Erreur lors de la vérification du JWT :", error);
        this.logout();
      }
    },
manageProgressBar(start = true) {
  if (!start) {
    clearInterval(this.progressInterval);
    this.progress = 100;
    this.loading = false; // Suppression du délai inutile
    this.progress = 0;
    return;
  }

  this.progress = 0;
  clearInterval(this.progressInterval);
  this.progressInterval = setInterval(() => {
    if (this.progress < 90) this.progress += Math.random() * 10;
  }, 500);
}
,

async login() {
  if (!this.email || !this.password) {
    return this.setMessage("Veuillez remplir tous les champs.", "alert-danger");
  }

  console.time("Total Login Time");
  console.time("Hash Time");

  this.loading = true;
  this.manageProgressBar(true);

  // Hash du mot de passe
  const hashedPassword = await this.sha256(this.password);

  console.timeEnd("Hash Time");
  console.time("API Request Time");

  await this.tryCatchWrapper(async () => {
    console.log("📡 Envoi de la requête de connexion...");
    
    const response = await fetch(`${this.apiBaseURL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: "login",
        email: this.email,
        password: hashedPassword,
      }),
    });

    console.timeEnd("API Request Time");
    console.time("Response Processing Time");

    const data = await response.json();

    console.timeEnd("Response Processing Time");
    console.time("Session Storage Time");

    if (data.status === "success" && data.data.jwt) {
      console.log("✅ Connexion réussie !");
      await this.storeSession(data.data);
      console.timeEnd("Session Storage Time");
      console.timeEnd("Total Login Time");
      this.$router.push("/dashboard");
    } else {
      this.setMessage(`❌ ${data.message}`, "alert-danger");
      console.timeEnd("Total Login Time");
    }
  }, "Erreur de connexion.");

  this.manageProgressBar(false);
}

,

   async storeSession(data) {
  await setToken("jwt", data.jwt);
  await setToken("refreshjwt", data.refreshToken);
  this.jwt = data.jwt;
  this.refreshjwt = data.refreshToken;

  // ✅ Ajout du stockage en localStorage
  localStorage.setItem("refreshjwt", data.refreshToken);

  this.decodeJWT(data.jwt);
},


    decodeJWT(jwt) {
      try {
        const decoded = jwtDecode(jwt);
        console.log("🎫 JWT décodé :", decoded);
        sessionStorage.setItem("prenom", decoded.prenom || "");
        sessionStorage.setItem("email", decoded.email || "");
      } catch (error) {
        console.error("🚨 Erreur lors du décodage du JWT :", error);
      }
    },

    async refreshToken() {
      if (this.isLoading) return;
      this.isLoading = true;

      await this.tryCatchWrapper(async () => {
        console.log("🔄 Rafraîchissement du JWT...");
        const refreshToken = this.refreshjwt || await getToken("refreshjwt") || localStorage.getItem("refreshjwt");


        if (!refreshToken) {
          console.warn("❌ Aucun refresh token disponible.");
          return;
        }

        const response = await fetch(`${this.apiBaseURL}?route=refresh&refreshToken=${encodeURIComponent(refreshToken)}`);
        const data = await response.json();

        if (data.status === "success" && data.data.jwt) {
          console.log("✅ Nouveau JWT reçu !");
          await this.storeSession(data.data);
        } else {
          console.warn("⚠️ Erreur lors du refresh :", data.message);
          this.logout();
        }
      }, "Erreur lors du refresh JWT.");

      this.isLoading = false;
    },

    async logout() {
      sessionStorage.clear();
      await removeToken("jwt");
      await removeToken("refreshjwt");
      this.jwt = "";
      this.refreshjwt = "";
      this.$router.push("/login");
    },

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
  font-size: 1,5rem;
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
  height: 4px;
  background-color: rgba(255, 255, 255, 0.2); /* Plus doux sur fond sombre */
  border-radius: 2px;
  overflow: hidden;
}

.loading-bar {
  height: 100%;
  background-color: #ff8c00 !important; /* Orange plus doux */
  transition: width 0.3s ease-in-out;
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
  padding: 8px 15px; /* Moins de padding pour un look plus fin */
  border-radius: 0px; /* Plus d'angles arrondis */
  transition: all 0.3s ease-in-out;
  font-size: 0.9rem; /* Texte plus petit */
  height: 38px; /* Ajustement de la hauteur */
   min-width: 120px; /* Définit une largeur minimale */
  width: auto; /* S'ajuste au contenu */
  
  text-transform: uppercase; /* Pour un style plus impactant */
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  box-shadow: none; /* Suppression de l’ombre */
  transform: scale(1.03); /* Légère animation au survol */
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
