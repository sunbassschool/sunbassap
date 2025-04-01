<template>
    <Layout>
      <div class="container mt-4">
  
        <h2 class="text-white mb-4">📋 Tes Feedbacks</h2>
  
        <div v-if="feedbackLoading" class="text-center text-light">
          <div class="spinner-border custom-spinner"></div>
          <p>Chargement des feedbacks...</p>
        </div>
  
        <div v-if="feedbackError" class="alert alert-danger">
          {{ feedbackError }}
        </div>
  
        <div v-if="feedbacks.length && !feedbackLoading">
          <div 
            v-for="fb in feedbacks" 
            :key="fb.ID"
            class="dashboard-card rounded-3 p-3 mb-3"
          >
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge" :class="fb.Type === 'Prof' ? 'bg-primary' : 'bg-secondary'">
                {{ fb.Type }}
              </span>
              <small class="text-muted">
                {{ formatDate(fb.Date_Publication) }}
              </small>
            </div>
  
            <p class="text-light mb-2">{{ fb.Contenu }}</p>
  
            <div class="d-flex justify-content-between align-items-center">
              <span :class="fb.Statut === 'Validé' ? 'text-success' : 'text-warning'">
                {{ fb.Statut }}
              </span>
              <span class="small text-light">Par {{ fb.Auteur }}</span>
            </div>
          </div>
        </div>
  
        <div v-if="!feedbacks.length && !feedbackLoading" class="text-light text-center">
          Aucun feedback pour l’instant.
        </div>
  
      </div>
    </Layout>
  </template>
  <script>
  import Layout from "../views/Layout.vue";
  import { getValidToken } from "@/utils/api.ts";
  import { jwtDecode } from "jwt-decode";
  
  export default {
    name: "Feedback",
    components: { Layout },
    data() {
      return {
        nouveauFeedback: "",
feedbackSentMessage: "",
sendingFeedback: false,

        feedbacks: [],
        feedbackLoading: false,
        feedbackError: null,
        routes: {
          GET: "AKfycbzj4MhES9BjjSTNvx3Tce3oVlh0P8KB1R0u5SPVjZXMdVk3DCYbUOcMUoBXo6A1FVuOkg",
          POST: "AKfycbzj4MhES9BjjSTNvx3Tce3oVlh0P8KB1R0u5SPVjZXMdVk3DCYbUOcMUoBXo6A1FVuOkg"
        },
        email: localStorage.getItem("email") || sessionStorage.getItem("email"),
        prenom: localStorage.getItem("prenom") || sessionStorage.getItem("prenom"),
        userData: JSON.parse(localStorage.getItem(`userData_${localStorage.getItem("prenom")}`)) || {},
      };
    },
  
    async mounted() {
      await this.fetchFeedbacks();
    },
  
    methods: {
      async fetchFeedbacks() {
        this.feedbackLoading = true;
        this.feedbackError = null;
  
        const jwt = await getValidToken();
        if (!jwt) {
          console.warn("🔐 JWT manquant ou expiré");
          this.feedbackLoading = false;
          return;
        }
  
        const params = {
          route: "getfeedbacks",
          jwt,
          id_eleve: this.userData.id || this.email
        };
  
        const url = this.getProxyURL(this.routes.GET, params);
  
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          });
  
          const result = await response.json();
          if (result.feedbacks) {
            this.feedbacks = result.feedbacks.reverse(); // Plus récents en premier
          } else {
            this.feedbackError = "Aucun feedback trouvé.";
          }
        } catch (err) {
          console.error("❌ Erreur récupération feedbacks :", err);
          this.feedbackError = "Erreur lors du chargement des feedbacks.";
        } finally {
          this.feedbackLoading = false;
        }
      },
  
      getProxyURL(routeId, params = {}) {
        const baseURL = `https://script.google.com/macros/s/${routeId}`;
        const query = new URLSearchParams(params).toString();
        const fullURL = `${baseURL}?${query}`;
        return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(fullURL)}`;
      },
  
      formatDate(dateString) {
        if (!dateString) return "Date inconnue";
        try {
          const date = new Date(dateString);
          return date.toLocaleString("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (error) {
          return dateString;
        }
      }
    }
  };
  </script>
  
  