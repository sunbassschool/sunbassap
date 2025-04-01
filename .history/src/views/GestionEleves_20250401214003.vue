<template>
    <Layout>
      <div class="container mt-4">
        <h2 class="text-white mb-4">👥 Liste des élèves</h2>
  
        <!-- 🔄 Loading -->
        <div v-if="loading" class="text-center text-light">
          <div class="spinner-border custom-spinner"></div>
          <p>Chargement des élèves...</p>
        </div>
  
        <!-- ❌ Erreur -->
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
  
        <!-- ✅ Élèves -->
        <div v-if="eleves.length && !loading" class="row g-3">
          <div v-for="eleve in eleves" :key="eleve.email" class="col-12 col-md-6 col-lg-4">
            <div class="card h-100 bg-dark text-light border-light">
              <div class="card-body">
                <h5 class="card-title">{{ eleve.prenom }} {{ eleve.nom }}</h5>
                <p class="card-text mb-1"><strong>Email :</strong> {{ eleve.email }}</p>
                <p class="card-text mb-1"><strong>Téléphone :</strong> {{ eleve.telephone || '—' }}</p>
                <p class="card-text mb-1"><strong>Statut :</strong> {{ eleve.statut || '—' }}</p>
                <p class="card-text mb-1"><strong>Objectif :</strong> {{ eleve.objectif || '—' }}</p>
                <p class="card-text mb-1"><strong>Trimestre :</strong> {{ eleve.trimestre || '—' }}</p>
  
                <!-- 🔗 Liens -->
                <div class="mt-2">
                  <a v-if="eleve.drive" :href="eleve.drive" class="btn btn-sm btn-outline-info me-2" target="_blank">
                    📁 Drive
                  </a>
                  <a v-if="eleve.youtube" :href="eleve.youtube" class="btn btn-sm btn-outline-danger" target="_blank">
                    ▶️ Playlist
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- ℹ️ Aucun élève -->
        <div v-if="!eleves.length && !loading" class="text-center text-light">
          Aucun élève trouvé.
        </div>
      </div>
    </Layout>
  </template>
  
  <script>
  import Layout from "@/views/Layout.vue";
  import { getValidToken } from "@/utils/api.ts";
  
  export default {
    name: "GestionEleves",
    components: { Layout },
    data() {
      return {
        eleves: [],
        loading: false,
        error: null,
        apiURL: "https://script.google.com/macros/s/AKfycbwr0r4jO4IXuWGm40O_phYiT_T3GZ9kbTE2NaqBXNuPmzh3teeWLkPeKS4u3dPeEFnafA/exec"
      };
    },
    async mounted() {
      await this.fetchEleves();
    },
    methods: {
      async fetchEleves() {
        this.loading = true;
        this.error = null;
  
        const jwt = await getValidToken();
        if (!jwt) {
          this.error = "JWT non valide.";
          this.loading = false;
          return;
        }
  
        const url = `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(
          this.apiURL + `?route=geteleves`
        )}`;
  
        try {
          const res = await fetch(url);
          const result = await res.json();
  
          if (result.status === "success") {
            this.eleves = result.data;
          } else {
            this.error = "Erreur lors de la récupération des élèves.";
          }
        } catch (err) {
          console.error("❌ Erreur fetchEleves :", err);
          this.error = "Erreur de connexion au serveur.";
        } finally {
          this.loading = false;
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .card {
    transition: transform 0.2s ease;
  }
  .card:hover {
    transform: scale(1.01);
  }
  </style>
  