<template>
    <Layout>
      <div class="container mt-4">
        <h2 class="text-white mb-4">📝 Feedbacks Admin</h2>
  
        <!-- 🔍 Sélection élève -->
        <div class="mb-4">
          <label class="form-label text-light">Choisir un élève</label>
          <input
            type="text"
            v-model="searchTerm"
            class="form-control"
            placeholder="Tape un prénom ou email"
            @input="filterEleves"
          />
          <ul v-if="filteredEleves.length" class="list-group mt-1">
            <li
              v-for="e in filteredEleves"
              :key="e.email"
              class="list-group-item list-group-item-action"
              @click="selectEleve(e)"
              style="cursor: pointer;"
            >
              {{ e.prenom }} {{ e.nom }} - {{ e.email }}
            </li>
          </ul>
        </div>
  
        <!-- 💬 Formulaire feedback -->
        <div v-if="selectedEleve" class="mb-4">
          <h5 class="text-light">Ajouter un feedback pour {{ selectedEleve.prenom }}</h5>
          <textarea
            v-model="nouveauFeedback"
            rows="4"
            class="form-control mb-2"
            placeholder="Écris ton message..."
          ></textarea>
          <button
            class="btn btn-success"
            @click="sendFeedback"
            :disabled="!nouveauFeedback.trim()"
          >
            Envoyer le feedback
          </button>
          <div v-if="feedbackSentMessage" class="text-success mt-2">
            {{ feedbackSentMessage }}
          </div>
        </div>
  
        <!-- 📋 Feedbacks existants -->
        <div v-if="feedbacks.length">
          <h5 class="text-white mb-3">Historique de feedbacks</h5>
          <div v-for="fb in feedbacks" :key="fb.ID" class="bg-dark text-light border rounded p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong>
  {{ fb.Type === 'Élève' ? (fb.Prenom || 'Élève inconnu') : 'Admin' }}
</strong>


              <small class="text-muted">{{ formatDate(fb.Date_Publication) }}</small>
            </div>
            <p>{{ fb.Contenu }}</p>
            <span class="badge bg-secondary">{{ fb.Statut }}</span>
          </div>
        </div>
        <h5 class="text-white mb-3">📋 Historique global des feedbacks</h5>

      </div>
    </Layout>
  </template>
  
  <script>
import Layout from "@/views/Layout.vue";
import { getValidToken } from "@/utils/api.ts";

export default {
  name: "AdminFeedback",
  components: { Layout },
  data() {
    return {
      eleves: [],
      filteredEleves: [],
      selectedEleve: null,
      searchTerm: "",
      nouveauFeedback: "",
      feedbackSentMessage: "",
      feedbacks: [],
      apiURL: "https://script.google.com/macros/s/AKfycbwr0r4jO4IXuWGm40O_phYiT_T3GZ9kbTE2NaqBXNuPmzh3teeWLkPeKS4u3dPeEFnafA/exec"
    };
  },
  async mounted() {
    console.log("🔁 Chargement de la liste des élèves...");
    await this.fetchEleves();
await this.fetchAllFeedbacks();

  },
  methods: {
    async fetchEleves() {
      const url = this.getProxyURL({ route: "geteleves" });
      console.log("📡 URL utilisée pour geteleves :", url);

      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("📥 Réponse reçue :", data);
        if (Array.isArray(data)) {
          this.eleves = data;
          console.log("✅ Éleves chargés :", data.length);
        } else {
          console.warn("❌ Format inattendu reçu :", data);
        }
      } catch (err) {
        console.error("❌ Erreur lors du fetch geteleves :", err);
      }
    },
    async fetchAllFeedbacks() {
  const jwt = await getValidToken();
  const url = this.getProxyURL({ route: "getfeedbacks", jwt });
  console.log("📡 URL pour historique global :", url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    this.feedbacks = data.feedbacks || [];
    console.log("📥 Feedbacks initiaux :", this.feedbacks.length);
  } catch (err) {
    console.error("❌ Erreur fetchAllFeedbacks :", err);
  }
}
,
    filterEleves() {
      const term = this.searchTerm.toLowerCase();
      this.filteredEleves = this.eleves.filter(e =>
        `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(term)
      );
    },
    async selectEleve(eleve) {
      console.log("👤 Élève sélectionné :", eleve);
      this.selectedEleve = eleve;
      this.searchTerm = `${eleve.prenom} ${eleve.nom}`;
      this.filteredEleves = [];
      await this.fetchFeedbacks();
    },
    async fetchFeedbacks() {
      const jwt = await getValidToken();
      const url = this.getProxyURL({
        route: "getfeedbacks",
        jwt,
        id_eleve: this.selectedEleve.email
      });

      console.log("📡 URL utilisée pour getfeedbacks :", url);
      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("📥 Feedbacks reçus :", data);
        this.feedbacks = data.feedbacks || [];
      } catch (err) {
        console.error("❌ Erreur lors du fetch getfeedbacks :", err);
      }
    },
    async sendFeedback() {
      const jwt = await getValidToken();
      const payload = {
        route: "addfeedback",
        jwt,
        id_cours: "admin",
        id_eleve: this.selectedEleve.email,
        prenom: this.selectedEleve.prenom,
        contenu: this.nouveauFeedback.trim()
      };

      const url = this.getProxyPostURL();
      console.log("📤 Payload envoyé à addfeedback :", payload);
      console.log("🌐 URL POST utilisée :", url);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log("📥 Réponse addfeedback :", result);

        if (result.success) {
          this.feedbackSentMessage = "✅ Feedback envoyé !";
          this.nouveauFeedback = "";
          await this.fetchFeedbacks();
          setTimeout(() => (this.feedbackSentMessage = ""), 3000);
        }
      } catch (err) {
        console.error("❌ Erreur API addfeedback :", err);
      }
    },
    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleString("fr-FR");
    },
    getProxyURL(params) {
      const base = `${this.apiURL}?` + new URLSearchParams(params).toString();
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(base)}`;
    },
    getProxyPostURL() {
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(this.apiURL)}`;
    }
  }
};
</script>

  
  <style scoped>
  .list-group-item {
    background-color: #222;
    color: #fff;
  }
  .list-group-item:hover {
    background-color: #333;
  }
  </style>
  