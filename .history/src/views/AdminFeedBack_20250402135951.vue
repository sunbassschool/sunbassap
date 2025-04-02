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
              <strong>{{ fb.Type }}</strong>
              <small class="text-muted">{{ formatDate(fb.Date_Publication) }}</small>
            </div>
            <p>{{ fb.Contenu }}</p>
            <span class="badge bg-secondary">{{ fb.Statut }}</span>
          </div>
        </div>
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
      await this.fetchEleves();
    },
    methods: {
      async fetchEleves() {
        const url = this.getProxyURL({ route: "geteleves" });
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) this.eleves = data;
      },
      filterEleves() {
        const term = this.searchTerm.toLowerCase();
        this.filteredEleves = this.eleves.filter(e =>
          `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(term)
        );
      },
      async selectEleve(eleve) {
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
        const res = await fetch(url);
        const data = await res.json();
        this.feedbacks = data.feedbacks || [];
      },
      async sendFeedback() {
        const jwt = await getValidToken();
        const payload = {
          route: "addfeedback",
          jwt,
          id_cours: "admin", // ou autre ID si besoin
          id_eleve: this.selectedEleve.email,
          prenom: this.selectedEleve.prenom,
          contenu: this.nouveauFeedback.trim()
        };
  
        const res = await fetch(this.getProxyPostURL(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
  
        const result = await res.json();
        if (result.success) {
          this.feedbackSentMessage = "✅ Feedback envoyé !";
          this.nouveauFeedback = "";
          await this.fetchFeedbacks();
          setTimeout(() => (this.feedbackSentMessage = ""), 3000);
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
  