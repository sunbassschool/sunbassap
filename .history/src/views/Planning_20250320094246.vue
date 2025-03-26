<template>
  <Layout>
    <div class="container-xxl mt-4">
      <!-- 🔴 Spinner rouge pendant le chargement -->
      <div v-if="loading" class="loading-container">
        <div class="spinner-border text-danger" role="status"></div>
        <p class="text-muted mt-2">Chargement du planning...</p>
      </div>

      <!-- ✅ Message si aucun cours trouvé, mais seulement après le chargement -->
      <div v-if="!loading && planningData.length === 0" class="alert alert-warning text-center mt-3">
        <p class="mb-2">Aucun cours trouvé pour ton compte.</p>
        <a href="https://www.sunbassschool.com/step/inscription-aux-cours-en-visio/" 
          class="btn btn-primary mt-2" 
          target="_blank" 
          rel="noopener noreferrer">
          📅 Réserver un cours maintenant
        </a>
      </div>

      <!-- ✅ Tableau des cours, affiché uniquement après le chargement -->
      <div v-if="!loading && planningData.length > 0" class="table-responsive mt-3">
        <table class="table table-hover shadow-sm" style="font-size: 1rem;">
          <thead class="table-dark">
            <tr>
              <th scope="col">📆 Date & Heure</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in planningData" :key="index" @click="openMeet(row.meet)" class="clickable-row">
              <td><strong>{{ row.formattedDate }}</strong></td>
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
import { ref, computed, onMounted } from "vue";

export default {
  name: "Planning",
  components: { Layout },
  setup() {
    const planningData = ref([]);
    const loading = ref(true);

    const API_URL =
      "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec";
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures

    // ✅ **Récupération des informations utilisateur depuis `userData_undefined`**
    const userData = JSON.parse(localStorage.getItem("userData_undefined") || "{}");

    // ✅ **Extraction de l'email depuis les logs**
    const email = computed(() => {
      if (userData.logs && Array.isArray(userData.logs)) {
        const emailLog = userData.logs.find((log) =>
          log.includes("📡 Requête reçue pour email:")
        );
        if (emailLog) {
          const match = emailLog.match(/email:\s*([\w.-]+@[\w.-]+\.\w+)/);
          return match ? match[1] : "";
        }
      }
      return "";
    });

    const prenom = computed(() => userData.nom || "");

    console.log("📌 Contenu de userData_undefined :", userData);
    console.log("📧 Email extrait :", email.value);
    console.log("👤 Prénom extrait :", prenom.value);

    const fetchPlanningData = async () => {
      console.log("🚀 fetchPlanningData() appelé !");

      if (!email.value || !prenom.value) {
        console.error("❌ Erreur : Email ou prénom manquant !");
        loading.value = false;
        return;
      }

      console.log("🌐 Envoi des paramètres à l'API :", {
        email: email.value,
        prenom: prenom.value,
      });

      // 🏷️ **Définition des clés de cache**
      const cacheKey = `planning_${email.value}_${prenom.value}`;
      const cacheTimestampKey = `${cacheKey}_timestamp`;

      // 🕒 **Vérifier si on a des données en cache**
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
      const cacheExpired =
        !cacheTimestamp || Date.now() - parseInt(cacheTimestamp, 10) > cacheDuration;

      // ✅ **Étape 1 : Charger immédiatement les données du cache si valide**
      if (cachedData && !cacheExpired) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.success && Array.isArray(parsedData.planning)) {
            console.log("⚡ Chargement du planning depuis le cache !");
            planningData.value = parsedData.planning;
            loading.value = false;
          }
        } catch (error) {
          console.error("❌ Erreur de parsing du cache :", error);
        }
      }

      // ✅ **Étape 2 : Lancer une requête API en arrière-plan pour mise à jour**
      try {
        const response = await axios.get(
          `${API_URL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`
        );

        console.log("📡 Réponse API reçue :", response.data);

        if (response.data.success && Array.isArray(response.data.planning)) {
          planningData.value = response.data.planning;

          // ✅ Mise à jour du cache
          localStorage.setItem(cacheKey, JSON.stringify(response.data));
          localStorage.setItem(cacheTimestampKey, Date.now().toString());
        } else {
          console.warn("⚠️ L'API n'a pas retourné de planning valide.");
        }
      } catch (error) {
        console.error("❌ Erreur lors du chargement des cours :", error);
        alert("Une erreur est survenue lors du chargement de ton planning.");
      } finally {
        loading.value = false;
      }
    };

    const openMeet = (url) => {
      if (url) {
        window.open(url, "_blank");
      }
    };

    onMounted(() => {
      fetchPlanningData(); // 🔥 Charge le planning dès le montage
    });

    return { planningData, loading, openMeet };
  },
};
</script>

<style scoped>
/* ✅ Style du spinner rouge */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

/* ✅ Tableaux et affichage */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.table th {
  background-color: #212529;
  color: #ffffff;
}

.table-hover tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

/* ✅ Messages d'alerte en pleine largeur */
.alert {
  width: 100%;
  font-weight: bold;
  font-size: 1.1rem;
  text-align: center;
  padding: 20px;
}

/* ✅ Adaptation mobile */
@media (max-width: 768px) {
  .table th, .table td {
    padding: 10px;
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .container-xxl {
    padding-left: 5px;
    padding-right: 5px;
  }

  .alert {
    font-size: 1rem;
    padding: 10px;
  }
}
</style>
