<template>
  <Layout>
    <div class="container d-flex justify-content-center align-items-center mt-5">
      <div class="card shadow p-4 w-50">
        <h2 class="text-center mb-4">🔐 Réinitialisation du mot de passe</h2>

        <form @submit.prevent="requestReset">
          <div class="mb-3">
            <label for="email" class="form-label">Adresse e-mail</label>
            <input 
              v-model="email" 
              type="email" 
              id="email"
              class="form-control"
              required
              autocomplete="off"
            >
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading">
            <span v-if="!loading">Envoyer</span>
            <span v-else>Envoi en cours...</span>
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
  name: "ForgotPassword",
  components: { Layout },
  data() {
    return {
      email: "",
      message: "",
      messageType: "",
      loading: false,
    };
  },
  methods: {
async requestReset() {
  if (!this.email) {
    this.message = "Veuillez entrer votre adresse e-mail.";
    this.messageType = "alert-danger";
    return;
  }

  this.loading = true;

  try {
    // 🔥 Construction de l'URL avec l'email en paramètre GET
    const apiUrl = `https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbwyVuqrGgzPZVTc9YsGF6-UVzX_5Adyrgs1OsSXW6h_ONbNL2Zi0_joOXowRNK3-YHZyQ/exec?route=forgotPassword&email=${encodeURIComponent(this.email)}`;

    // 🔥 Envoi de la requête en GET, car l'API l'exige sous ce format
    const response = await fetch(apiUrl, {
      method: "GET", // 📌 Passage en GET au lieu de POST
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json();
    console.log("Réponse API :", data); // ✅ Debug pour voir la réponse

    this.loading = false;

    if (data.status === "success") {
      this.message = "✅ Si l'email existe, un lien de réinitialisation a été envoyé.";
      this.messageType = "alert-success";
    } else {
      this.message = "⚠️ " + data.message;
      this.messageType = "alert-danger";
    }
  } catch (error) {
    console.error("❌ Erreur Fetch :", error);
    this.message = "❌ Problème de connexion au serveur.";
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
