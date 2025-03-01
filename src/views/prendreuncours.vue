<template>
    <Layout>
      <div class="container mt-4">
        <h2 class="text-center mb-3">📅 Planning des Cours</h2>
        <p class="text-muted text-center">Clique sur une ligne pour rejoindre ton cours.</p>
  
        <!-- ✅ Chargement avec message -->
        <div v-if="loading" class="d-flex flex-column align-items-center mt-4">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <p class="text-muted">Chargement de ton planning...</p>
        </div>
  
        <!-- ✅ Message si erreur -->
        <div v-if="!loading && errorMessage" class="alert alert-danger text-center mt-3">
          {{ errorMessage }}
        </div>
  
        <!-- ✅ Message si aucun cours trouvé, mais seulement après le chargement -->
        <div v-if="!loading && planningData.length === 0 && !errorMessage" class="alert alert-warning text-center mt-3">
          Aucun cours trouvé pour ton compte.
        </div>
  
        <!-- ✅ Tableau des cours, affiché uniquement après le chargement -->
        <div v-if="!loading && planningData.length > 0" class="table-responsive mt-3">
          <table class="table table-hover shadow-sm">
            <thead class="table-dark">
              <tr>
                <th scope="col">📆 Date & Heure</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in planningData" :key="index" @click="openMeet(row.meet)" class="clickable-row">
                <td><strong>{{ row.date }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  </template>
  
  <script>
  import Layout from "../views/Layout.vue";
  import axios from "axios";
  import { ref, onMounted } from "vue";
  
  export default {
    name: "Planning",
    components: {
      Layout,
    },
    setup() {
      const planningData = ref([]);
      const loading = ref(true);
      const errorMessage = ref("");
  
      // ✅ URL de l'Apps Script
      const API_URL = "https://script.google.com/macros/s/AKfycbyaXWbAryyHp1t7HmdCHN7EuQwVlwol5u3WTtULrtN6yY9JFxjikiExxvQrakD56QRHyw/exec";
  
      // ✅ Récupération des infos de session
      const prenom = localStorage.getItem("prenom");
      const email = localStorage.getItem("email");
  
      // ⏳ Définition de la durée du cache (5 minutes)
      const cacheDuration = 5 * 60 * 1000; 
  
      const fetchPlanningData = async () => {
        if (!prenom || !email) {
          errorMessage.value = "Impossible de récupérer tes informations. Reconnecte-toi.";
          loading.value = false;
          return;
        }
  
        // ✅ Vérifier si les données sont en cache
        const cacheKey = `planning_${email}_${prenom}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  
        if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
          console.log("⚡ Chargement du planning depuis le cache");
          planningData.value = JSON.parse(cachedData);
          loading.value = false;
          return;
        }
  
        try {
          console.log("🌐 Récupération des données depuis l'API...");
          const url = `${API_URL}?route=planning&email=${encodeURIComponent(email)}&prenom=${encodeURIComponent(prenom)}`;
          const response = await axios.get(url);
          console.log("✅ Données reçues depuis l'API :", response.data);
  
          planningData.value = response.data || [];
  
          if (planningData.value.length === 0) {
            errorMessage.value = "Aucun cours trouvé.";
          }
  
          // ✅ Stocker les données en cache
          localStorage.setItem(cacheKey, JSON.stringify(planningData.value));
          localStorage.setItem(`${cacheKey}_timestamp`, Date.now());
  
        } catch (error) {
          console.error("❌ Erreur lors du chargement du planning :", error);
          errorMessage.value = "Erreur de chargement des cours.";
        } finally {
          loading.value = false;
        }
      };
  
      // ✅ Fonction pour ouvrir Meet au clic
      const openMeet = (url) => {
        if (url) {
          window.open(url, "_blank");
        }
      };
  
      onMounted(fetchPlanningData);
  
      return { planningData, loading, errorMessage, openMeet };
    },
  };
  </script>
  
  
  <style scoped>
  /* ✅ Style amélioré */
  h2 {
    font-weight: bold;
    color: #343a40;
  }
  
  .table {
    border-radius: 10px;
    overflow: hidden;
  }
  
  /* ✅ Meilleure lisibilité sur mobile */
  .table th, .table td {
    padding: 15px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
  }
  
  .table th {
    background-color: #212529;
    color: #ffffff;
  }
  
  /* ✅ Effet au survol et curseur main */
  .table-hover tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.05);
    cursor: pointer;
  }
  
  /* ✅ Gestion des erreurs */
  .alert {
    font-weight: bold;
    font-size: 1.1rem;
  }
  </style>
  