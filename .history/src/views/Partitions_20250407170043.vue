<template>
    <Layout>
      <div class="container mt-4">
        
  
        <!-- Barre de recherche et filtres -->
        <div class="row mb-3">
          <div class="col-12 col-md-4 mb-2 mb-md-0">
            <input v-model="search" class="form-control" placeholder="🔎 Rechercher..." />
          </div>
          <div class="col-12 col-md-4 mb-2 mb-md-0">
            <select v-model="selectedStyle" class="form-control">
              <option value="">🎵 Tous les styles</option>
              <option v-for="style in styles" :key="style" :value="style">{{ style }}</option>
            </select>
          </div>
          <div class="col-12 col-md-4">
            <select v-model="selectedLevel" class="form-control">
              <option value="">📊 Tous les niveaux</option>
              <option v-for="level in levels" :key="level" :value="level">{{ level }}</option>
            </select>
          </div>
        </div>
  
        <!-- Chargement -->
        <div v-if="loading" class="d-flex justify-content-center mt-4">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
  
        <!-- Liste des partitions -->
        <div v-else>
          <!-- Mode Bureau (Tableau) -->
          <div class="d-none d-md-block">
            <div class="table-responsive">
              <table class="table table-hover shadow-sm">
                <thead class="table-dark">
                  <tr>
                    <th>🎼 Nom</th>
                    <th>✍️ Auteur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(partition, index) in filteredPartitions" :key="index" @click="openPartition(partition.id)" class="clickable-row">
                    <td>{{ partition.nom }}</td>
                    <td>{{ partition.auteur }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
  
          <!-- Mode Mobile (Liste simple) -->
          <div class="d-md-none">
            <ul class="list-group">
              <li v-for="(partition, index) in filteredPartitions" :key="index" 
                  @click="openPartition(partition.id)" 
                  class="list-group-item d-flex justify-content-between align-items-center clickable-row">
                <div>
                  <strong>🎼 {{ partition.nom }}</strong>
                  <p class="text-muted m-0 small">✍️ {{ partition.auteur }}</p>
                </div>
                <span class="badge bg-primary text-white">📄</span>
              </li>
            </ul>
          </div>
  
        </div>
      </div>
    </Layout>
  </template>
  
  <script>
import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";

export default {
  name: "Partitions",
  components: { Layout },
  setup() {
    const partitions = ref([]);
    const loading = ref(true);
    const search = ref("");
    const selectedStyle = ref("");
    const selectedLevel = ref("");

    const SHEET_ID = "1PuxK7najS8M8v6h3XQMwOaH5skTNWDJXI3zYiLO1rRM";
    const API_KEY = "AIzaSyBo0kz-JkCiuWumprwn5kpiVPqYmKr5NZI";
    const RANGE = "'partitions'!A2:J";

    // ⏳ Définition de la durée du cache (5 minutes)
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures
 
    console.log("📌 Avant chargement partitions, userData_ =", localStorage.getItem("userData_"));

    const fetchPartitions = async () => {
      const cacheKey = "partitions_cache";
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cachedData = localStorage.getItem(cacheKey);

      // ✅ Vérification du cache avant d'appeler l'API
      if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < cacheDuration) {
        console.log("⚡ Chargement des partitions depuis le cache");
        partitions.value = JSON.parse(cachedData);
        loading.value = false;
        return;
      }

      try {
        console.log("🌐 Récupération des partitions depuis l'API...");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await axios.get(url);
        const rows = response.data.values || [];

        if (rows.length > 0) {
          partitions.value = rows.map(row => ({
            nom: row[0],
            auteur: row[1],
            style: row[2] || "",  // Ajout du style
            niveau: row[3] || "", // Ajout du niveau
            id: row[8]
          }));
        }

        // ✅ Stocker les données en cache
        localStorage.setItem(cacheKey, JSON.stringify(partitions.value));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now());

      } catch (error) {
        console.error("❌ Erreur lors du chargement des partitions :", error);
      } finally {
        loading.value = false;
      }
    };

    // ✅ Filtrage des partitions
    const filteredPartitions = computed(() => {
      const lowerSearch = search.value.toLowerCase();
      return partitions.value.filter(partition =>
        (lowerSearch === "" || partition.nom.toLowerCase().includes(lowerSearch) ||
         partition.auteur.toLowerCase().includes(lowerSearch)) &&
        (selectedStyle.value === "" || partition.style === selectedStyle.value) &&
        (selectedLevel.value === "" || partition.niveau === selectedLevel.value)
      );
    });

    // ✅ Récupération des styles uniques
    const styles = computed(() => {
      const uniqueStyles = new Set(partitions.value.map(p => p.style).filter(Boolean));
      return [...uniqueStyles];
    });

    // ✅ Récupération des niveaux uniques
    const levels = computed(() => {
      const uniqueLevels = new Set(partitions.value.map(p => p.niveau).filter(Boolean));
      return [...uniqueLevels];
    });

    // ✅ Fonction pour ouvrir une partition
    const openPartition = (fileId) => {
      window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank");
    };

    onMounted(() => {
  // 📌 Sauvegarde l'état actuel de `userData_`
  const oldUserData = localStorage.getItem("userData_");

  fetchPartitions().then(() => {
    // 🔍 Vérifie si `userData_` a changé après l'appel API
    const newUserData = localStorage.getItem("userData_");

    if (oldUserData && newUserData && oldUserData !== newUserData) {
      console.warn("🚨 userData_ a été écrasé, on le restaure !");
      localStorage.setItem("userData_", oldUserData);
    }
  });
});


    return { partitions, loading, search, selectedStyle, selectedLevel, styles, levels, filteredPartitions, openPartition };
  },
};
</script>

  
  
  <style scoped>
  h2 {
    font-weight: bold;
    color: #343a40;
  }
  
  .table-responsive {
    overflow-x: auto;
  }
  
  .table {
    border-radius: 10px;
    overflow: hidden;
  }
  
  .table th, .table td {
    padding: 8px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
    font-size: 14px;
  }
  
  .table th {
    background-color: #212529;
    color: #ffffff;
  }
  
  .table-hover tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .clickable-row {
    cursor: pointer;
    transition: transform 0.1s ease-in-out;
  }
  
  .clickable-row:hover {
    transform: scale(1.02);
  }
  
  /* Mode mobile (Liste) */
  .list-group-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    font-size: 16px;
    border: none;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
    transition: background 0.1s ease-in-out;
  }
  
  .list-group-item:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  .list-group-item strong {
    font-size: 16px;
  }
  
  .list-group-item p {
    font-size: 12px;
    color: #6c757d;
  }
  
  .badge {
    font-size: 14px;
    padding: 6px 10px;
  }
  .table-responsive {
  max-width: 100%;
  overflow-x: auto;
}
body {
  overflow-x: hidden;
}

.container {
  max-width: 100vw;
  overflow-x: hidden;
}
#sw-update-toast {
  max-width: 95vw;
  box-sizing: border-box;
  word-wrap: break-word;
}

  @media (max-width: 768px) {
    .table th, .table td {
      font-size: 12px;
      padding: 6px;
    }
  }
  </style>
  