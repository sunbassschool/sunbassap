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
        const response = await fetch(`https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbw8ZrV9koK8_QGeiEJPh3Tmg7PFNTKqWKnWAk5_TskHnpt5Y_C678sz7YgRbSg2hAnDog/exec?route=verifyToken&token=${encodeURIComponent(this.token)}`);
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
    const apiUrl = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbz8SeYnPoqorRaGQiUwlGd2YXqd0a5MtbHEToHc0nVa9ARFirCW6KCh4u98KUGmWto-LQ/exec";
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

    if (data.status === "success") {
      this.message = "✅ Mot de passe mis à jour !";
      this.messageType = "alert-success";
    this.$refs.layout.logout();

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


.card {
  width: 80% !important; /* Ajuste selon ton besoin */
  max-width: 800px; /* Limite la largeur pour éviter qu'elle soit trop grande */
}
</style>
