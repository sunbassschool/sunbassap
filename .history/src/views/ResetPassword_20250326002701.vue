<template>
  <Layout ref="layout">

   <div class="container d-flex justify-content-center align-items-center mt-5">


      <div class="card shadow p-4 w-50">
        <h2 class="text-center mb-4">🔑 Nouveau mot de passe</h2>

        <div v-if="loading">
          <p class="text-center">🔄 Vérification du lien...</p>
        </div>

        <form v-if="tokenValid" @submit.prevent="resetPassword">
          <div class="mb-3">
            <label for="password" class="form-label">Nouveau mot de passe</label>
            <input 
              v-model="password" 
              type="password" 
              id="password"
              class="form-control"
              required
            >
          </div>

          <div class="mb-3">
            <label for="confirmPassword" class="form-label">Confirmer le mot de passe</label>
            <input 
              v-model="confirmPassword" 
              type="password" 
              id="confirmPassword"
              class="form-control"
              required
            >
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="!loading">Réinitialiser</span>
            <span v-else>Traitement...</span>
          </button>
        </form>

        <div v-if="message" class="alert mt-3" :class="messageType">{{ message }}</div>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "@/views/Layout.vue";
import { logoutUser } from "@/utils/api";  // Assure-toi que le chemin est correct selon ton projet

export default {
  name: "ResetPassword",
  components: { Layout },
  data() {
    return {
      password: "",
      confirmPassword: "",
      message: "",
      messageType: "",
      loading: true, // Active le mode chargement avant la vérification du token
      token: this.$route.query.token || null,
      tokenValid: false, // ✅ Gère l'affichage du formulaire uniquement si le token est valide
    };
  },
  async mounted() {
    await this.verifyToken();
  },
  methods: {
    async verifyToken() {
      if (!this.token) {
        this.message = "❌ Lien invalide.";
        this.messageType = "alert-danger";
        this.loading = false;
        return;
      }

      try {
        const response = await fetch(`https://cors-proxy-sbs.vercel.app/api/proxy?url=https://script.google.com/macros/s/AKfycbykYySA5D4taWYaICxCHt6l3WmOM5RNg4P_rCoJowfxusXpSy5D-ZuGFao9UjGWHD86AA/exec?route=verifyToken&token=${encodeURIComponent(this.token)}`);
        const data = await response.json();

        if (data.status === "success") {
          this.tokenValid = true;
          this.message = "✅ Lien de réinitialisation valide.";
          this.messageType = "alert-success";
        } else {
          this.message = "⚠️ Lien expiré ou invalide.";
          this.messageType = "alert-danger";
        }
      } catch (error) {
        console.error(error);
        this.message = "❌ Erreur de connexion.";
        this.messageType = "alert-danger";
      }

      this.loading = false;
    },

    async sha256(text) {
      const buffer = new TextEncoder().encode(text);
      const hash = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    },

    async resetPassword() {
      if (!this.password || !this.confirmPassword) {
        this.message = "❌ Veuillez remplir tous les champs.";
        this.messageType = "alert-danger";
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.message = "❌ Les mots de passe ne correspondent pas.";
        this.messageType = "alert-danger";
        return;
      }

      this.loading = true;

      try {
        const hashedPassword = await this.sha256(this.password); // 🔐 Sécurise le mot de passe avant l'envoi

        // 🔍 Vérifie l'URL et les données envoyées
        const apiUrl = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbzfgtqcCPaKj92SH2TiePZbKHTykkVkfE7PG_ivNV0hKsNNtXbl1RTRcI1xQbM1GbI_Pw/exec";
        console.log("🔗 API URL appelée :", apiUrl);
        console.log("📤 Données envoyées :", {
          route: "resetPassword",
          token: this.token,
          newPassword: hashedPassword,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route: "resetPassword",
            token: this.token,
            newPassword: hashedPassword, // 🔐 Envoie un hash au lieu du mot de passe brut
          }),
        });

        console.log("🔍 Réponse brute API :", response);

        const textResponse = await response.text(); // 🔍 Récupère la réponse brute avant de parser
        console.log("🔍 Réponse texte API :", textResponse);

        // 🔍 Vérifie si la réponse est JSON valide
        let data;
        try {
          data = JSON.parse(textResponse);
        } catch (parseError) {
          console.error("❌ Erreur lors du parsing JSON :", parseError);
          this.message = "❌ Erreur serveur : réponse invalide.";
          this.messageType = "alert-danger";
          this.loading = false;
          return;
        }

        console.log("🔍 Réponse JSON API :", data);
        
        this.loading = false;

        // Vérifie si le mot de passe a été réinitialisé avec succès
        if (data.message === "Mot de passe réinitialisé avec succès !") {
  this.message = "✅ Mot de passe mis à jour !";
  this.messageType = "alert-success";

  // Appeler logoutUser pour déconnecter l'utilisateur
  logoutUser();

  setTimeout(() => this.$router.push("/login"), 2000);
} else {
  this.message = "⚠️ Lien expiré ou invalide.";
  this.messageType = "alert-danger";
}
      } catch (error) {
        console.error("❌ Erreur lors de la requête API :", error);
        this.message = "❌ Erreur serveur.";
        this.messageType = "alert-danger";
        this.loading = false;
      }
    }
  }
};
</script>


<style scoped>
.container {
  display: flex;
  align-items: flex-start; /* Au lieu de center */
 
  width: 100% !important; /* Prend toute la largeur de l'écran */
  max-width: 1200px; /* Ajuste selon tes besoins */


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
.card {
  width: 80% !important; /* Ajuste selon ton besoin */
  max-width: 800px; /* Limite la largeur pour éviter qu'elle soit trop grande */
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
</style>
