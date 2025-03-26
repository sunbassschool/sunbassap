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
    // 🔗 URL cible avec tous les paramètres encodés
    const targetURL = `https://script.google.com/macros/s/AKfycbyBrhgMrzK14HMgiYI5SgkiJElfTmdX70RSnNJ85nw_6mVCIY4vrt2vL-DTMCEtu6mB4A/exec?route=forgotPassword&email=${encodeURIComponent(this.email)}`;
    const proxyURL = `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(targetURL)}`;

    console.log("📡 URL finale GET via proxy :", proxyURL);

    const response = await fetch(proxyURL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    const data = await response.json();
    console.log("✅ Réponse API :", data);

    if (data.status === "success") {
      this.message = "✅ Si l'email existe, un lien de réinitialisation a été envoyé.";
      this.messageType = "alert-success";
    } else {
      this.message = "⚠️ " + (data.message || "Une erreur est survenue.");
      this.messageType = "alert-danger";
    }
  } catch (error) {
    console.error("❌ Erreur réseau :", error);
    this.message = "❌ Problème de connexion au serveur.";
    this.messageType = "alert-danger";
  }

  this.loading = false;
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
