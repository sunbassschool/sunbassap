<template>
  <Layout>
    <div class="container-xxl mt-4">


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

  const email = ref(localStorage.getItem("email") || "");
  const prenom = ref(localStorage.getItem("prenom") || "");

  const API_URL =
    "https://cors-proxy-sbs.vercel.app/api/proxy?url=https://script.google.com/macros/s/AKfycbyvFb607O-JB2ZGgY9Ei1IPdoIA_AjsgdcZ_oRlBc6z1w2gK3nMnq-Sp0R6VrUoNO5lIg/exec";
  const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures

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

    const cacheKey = `planning_${email.value}_${prenom.value}`;
    const cacheTimestampKey = `${cacheKey}_timestamp`;

    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
    const cacheExpired =
      !cacheTimestamp || Date.now() - parseInt(cacheTimestamp, 10) > cacheDuration;

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

    try {
      const baseURL = "https://script.google.com/macros/s/AKfycbyvFb607O-JB2ZGgY9Ei1IPdoIA_AjsgdcZ_oRlBc6z1w2gK3nMnq-Sp0R6VrUoNO5lIg/exec";
const internalURL = `${baseURL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`;
const finalURL = `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(internalURL)}`;

const response = await axios.get(finalURL);


      console.log("📡 Réponse API reçue :", response.data);

      if (response.data.success && Array.isArray(response.data.planning)) {
        planningData.value = response.data.planning;

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
    fetchPlanningData();
  });

  return { planningData, loading, openMeet };
}
,
};
</script>













<style scoped>
/* ✅ Style amélioré */
h2 {
  font-weight: bold;
  color: #343a40;
}

/* ✅ Conteneur principal en pleine largeur */
.container-xxl {
  width: 100% !important;
  max-width: 100% !important;
  padding-left: 15px;
  padding-right: 15px;
}

/* ✅ S'assurer que tout le contenu est bien aligné sur toute la largeur */
.container-xxl > div {
  width: 100%;
}

/* ✅ Rendre le tableau fluide en responsive */
.table-responsive {
  width: 100%;
  overflow-x: auto;
}

/* ✅ Meilleure lisibilité du tableau */
.table {
  border-radius: 10px;
  overflow: hidden;
  width: 100%;
  font-size: 1rem;
}

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

/* ✅ Messages d'alerte en pleine largeur */
.alert {
  width: 100%;
  font-weight: bold;
  font-size: 1.1rem;
  text-align: center;
  padding: 20px;
}

/* ✅ Boutons en pleine largeur sur petits écrans */
.d-flex.justify-content-center.gap-3 {
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
}

.d-flex.justify-content-center.gap-3 .btn {
  flex: 1;
  min-width: 150px;
  max-width: 300px;
  text-align: center;
}

/* ✅ Adaptation mobile (≤ 768px) */
@media (max-width: 768px) {
  .table th, .table td {
    padding: 10px;
    font-size: 0.9rem;
  }
}

/* ✅ Adaptation très petits écrans (≤ 576px) */
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

