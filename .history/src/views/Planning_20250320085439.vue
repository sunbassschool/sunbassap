<template>
  <Layout>
    <div class="container-xxl mt-4">
      <!-- ✅ Affichage uniquement si l'utilisateur est connecté -->
  

      <!-- ✅ Chargement avec message -->
      <div v-if="loading" class="d-flex flex-column align-items-center mt-4">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <p class="text-muted">Chargement de ton planning...</p>
      </div>

      <!-- ✅ Message si l'utilisateur n'est pas connecté -->
      <div v-if="!loading && !isLoggedIn" class="alert alert-info text-center mt-3">
        <h4 class="fw-bold">🎸 Rejoins SunBassSchool et commence ton apprentissage !</h4>
        <p class="mb-3">
          Il semble que tu n’es pas encore connecté. Pour accéder à ton planning et réserver tes cours de basse, 
          connecte-toi ou crée un compte dès maintenant !
        </p>
        <div class="d-flex justify-content-center gap-3">
          <router-link to="/login" class="btn btn-primary">Se connecter</router-link>
          <router-link to="/Registerform" class="btn btn-success">S'inscrire</router-link>
        </div>
      </div>

      <!-- ✅ Message si aucun cours trouvé, mais seulement après le chargement -->
      <div v-if="!loading && planningData.length === 0 && isLoggedIn" class="alert alert-warning text-center mt-3">
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
import { jwtDecode } from "jwt-decode"; // 📌 Décodage du JWT

export default {
  name: "Planning",
  components: { Layout },
  setup() {
    const planningData = ref([]);
    const loading = ref(true);

    const API_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbxc69Alhr0V0-DqrHblDJonvPKFy8PbjhEA6nA4sC4aFCTJOCKO9t0Q-uaApC_vcXgyHA/exec";
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 heures


    // ✅ Vérifie si l'utilisateur est connecté
    const isLoggedIn = computed(() => {
  let jwt = sessionStorage.getItem("jwt");

  console.log("🔍 Vérification JWT dans sessionStorage :", jwt);

  // 🚀 Vérifier aussi dans localStorage si jamais il a été restauré récemment
  if (!jwt) {
    console.log("⚠️ Aucun JWT en sessionStorage, tentative de récupération depuis localStorage...");
    jwt = localStorage.getItem("jwt");

    if (jwt) {
      sessionStorage.setItem("jwt", jwt); // 🔄 Restaurer dans sessionStorage
      console.log("✅ JWT restauré depuis localStorage :", jwt);
    } else {
      console.warn("❌ Aucun JWT trouvé.");
      return false;
    }
  }

  try {
    const decoded = jwtDecode(jwt);
    return decoded.exp * 1000 > Date.now(); // 🔥 Vérifie si le JWT est expiré
  } catch (error) {
    console.error("🚨 JWT invalide :", error);
    return false;
  }
});

// ✅ Récupération des informations utilisateur depuis `localStorage` (clé : userData_)
// ✅ Récupération de `userData_` depuis localStorage
// ✅ Récupération des informations utilisateur depuis `userData_`
const userData = computed(() => {
  const storedData = localStorage.getItem("userData_");
  return storedData ? JSON.parse(storedData) : {}; // 🔥 On parse l'objet JSON
});

// ✅ Extraction des données correctement
const prenom = computed(() => userData.value.nom || ""); // 🔥 L'API met le prénom sous `nom`
const email = computed(() => {
  // ✅ On essaie d’extraire l'email des logs si nécessaire
  const logEntry = userData.value.logs?.find(log => log.includes("Requête reçue pour email:"));
  return logEntry ? logEntry.split("email: ")[1]?.split(", prénom:")[0] : "";
});

// ✅ Vérification des valeurs récupérées
console.log("📌 Contenu de userData_ :", userData.value);
console.log("📧 Email récupéré :", email.value);
console.log("👤 Prénom récupéré :", prenom.value);







    // ✅ Formatte la date pour l'affichage
    const formatDate = (rawDate) => {
      if (!rawDate) return "Date invalide";

      const match = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      if (!match) return "Date invalide";

      const [, day, month, year, hours, minutes] = match.map(Number);
      const parsedDate = new Date(year, month - 1, day, hours, minutes);

      return isNaN(parsedDate.getTime())
        ? "Date invalide"
        : new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(parsedDate);
    };

    // ✅ Vérifie si les données en cache sont valides
    const isCacheValid = (data) => {
      if (!data || typeof data !== "object") return false;

      // 🚨 Vérifier si l'API a renvoyé une erreur
      if (data.status === "error" || data.error) {
        if (data.error === "Aucun lien Meet trouvé") {
          console.warn("⚠️ Avertissement : Aucun lien Meet trouvé, mais ce n'est pas une erreur bloquante.");
          return true; // ✅ On garde les autres données du cache
        }
        console.error("❌ Cache invalide détecté :", data.error || data.message);
        return false;
      }

      // ✅ Vérifie si les données sont valides
      return Array.isArray(data) && data.every(item => item && typeof item === "object" && "date" in item);
    };

    const fetchPlanningData = async () => {
  if (!isLoggedIn.value) {
    loading.value = false;
    return;
  }

  // 🏷️ Définition des clés de cache
  const cacheKey = `planning_${email.value}_${prenom.value}`;
  const cacheTimestampKey = `${cacheKey}_timestamp`;

  // 🕒 Vérifier si on a des données en cache
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
  const cacheExpired = !cacheTimestamp || Date.now() - parseInt(cacheTimestamp, 10) > cacheDuration;

  // ✅ Étape 1 : Charger immédiatement les données du cache si valide
  if (cachedData && !cacheExpired) {
    try {
      const parsedData = JSON.parse(cachedData);
      
      // 🚀 Vérification que le cache est valide
      if (parsedData.success && Array.isArray(parsedData.planning)) {
        console.log("⚡ Chargement du planning depuis le cache !");
        planningData.value = parsedData.planning;
        loading.value = false; // ✅ Arrêter le loader immédiatement
      }
    } catch (error) {
      console.error("❌ Erreur de parsing du cache :", error);
    }
  }

  // ✅ Étape 2 : Lancer une requête API en arrière-plan pour mise à jour
  console.log("🌐 Requête API pour mise à jour du planning...");
  
  try {
    const response = await axios.get(`${API_URL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`);
    
    console.log("✅ Réponse complète de l'API :", response.data);

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

    onMounted(fetchPlanningData);

    return { planningData, loading, isLoggedIn, openMeet };
  },
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

