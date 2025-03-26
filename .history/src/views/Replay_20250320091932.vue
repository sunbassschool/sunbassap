<template>
  <Layout>
<!-- ✅ Barre de navigation fixe -->
<div class="fixed-menu">
  
  <select id="courseSelect" v-model="selectedCourse" class="form-select">
    <option value="" disabled>-- Sélectionnez un cours --</option>
    <option v-for="(row, index) in sortedPlanningData" :key="index" :value="row.formattedDate">
      {{ row.formattedDate }} - {{ row.commentaire || "Sans titre" }}
    </option>
  </select>
</div>





    <div class="container-xxl mt-4">
      <!-- ✅ Tableau des cours -->
   
       <!-- ✅ Tableau visible uniquement sur écran large (md et plus) -->
<div class="table-responsive" v-if="windowWidth >= 768">
  <table class="table table-hover shadow-sm">
    <thead class="table-dark">
      <tr>
        <th>📆 Date & Heure</th>
        <th class="d-none d-md-table-cell">📄 Commentaire</th>
        <th class="d-none d-md-table-cell">🎓 Trimestre</th>
        <th>✅ Présence</th>
        <th>🎥 Replay</th>
        <th class="d-none d-md-table-cell">🔗 Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in sortedPlanningData" 
    :key="index" 
    v-bind:ref="el => setCourseRef(el, row.formattedDate)"
    @click="openVideo(row.lienReplay, row.formattedDate)" 
    class="clickable-row">






        <td><strong>{{ row.formattedDate }}</strong></td>
        <td class="d-none d-md-table-cell">{{ row.commentaire || "Aucun" }}</td>
        <td class="d-none d-md-table-cell">{{ row.trimestre || "Non défini" }}</td>
        <td>{{ row.presence }}</td>
        <td>
          <img 
            v-if="generateThumbnail(row.lienReplay)" 
            :src="generateThumbnail(row.lienReplay)" 
            alt="Miniature Replay" 
            class="replay-thumbnail"
            @click="openVideo(row.lienReplay, row.formattedDate)"
          />
          <span v-else class="text-muted">⛔ Indisponible</span>
        </td>
        <td class="d-none d-md-table-cell">
          <a v-if="generateDownloadLink(row.lienReplay)" 
            :href="generateDownloadLink(row.lienReplay)" 
            target="_blank" 
            class="btn btn-primary btn-sm">
            📥 Télécharger
          </a>
          <button v-else class="btn btn-secondary btn-sm" disabled>⛔ Indisponible</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- 📱 Mode carte pour mobile (sm uniquement) -->
<div v-if="windowWidth < 768">
  <div v-for="(row, index) in sortedPlanningData" 
     :key="index" 
     class="card mb-3 shadow-sm p-2 position-relative"
     v-bind:ref="el => setCourseRef(el, row.formattedDate)">




    
<!-- ✅ Pastille de présence (s'affiche toujours) -->
<!-- ✅ Pastille de présence (s'affiche toujours) -->
<div 
  class="presence-badge" 
  :class="{
    'bg-success': row.presence === 'Présent',
    'bg-danger': row.presence === 'Absent',
    'bg-warning': row.presence === 'Reporté',
    'bg-primary': row.presence === 'À venir', /* 🔵 Ajouté ici */
    'bg-secondary': !row.presence || row.presence === 'Inconnu'
  }">
  {{ row.presence || "Inconnu" }}
</div>



    <div class="card-body d-flex flex-column align-items-center">
      
      <!-- ✅ Miniature en haut -->
      <div v-if="generateThumbnail(row.lienReplay)" class="mb-3 text-center">
        <img 
          :src="generateThumbnail(row.lienReplay)" 
          alt="Miniature Replay" 
          class="replay-thumbnail-lg"
          @click="openVideo(row.lienReplay, row.formattedDate)"
        />
      </div>

      <!-- ✅ Infos principales bien alignées -->
      <h5 class="card-title text-center">{{ row.formattedDate }}</h5>
      <p class="card-text"><strong>🎓 Trimestre:</strong> {{ row.trimestre || "Non défini" }}</p>
      <p class="card-text"><strong>📄 Commentaire:</strong> {{ row.commentaire || "Aucun" }}</p>

      <!-- ✅ Boutons d'action bien visibles -->
      <div class="d-flex justify-content-center mt-2 w-100">
        <a v-if="generateDownloadLink(row.lienReplay)" 
          :href="generateDownloadLink(row.lienReplay)" 
          target="_blank" 
          class="btn btn-primary btn-sm mx-1">
          📥 Télécharger
        </a>
        <button v-else class="btn btn-secondary btn-sm mx-1" disabled>⛔ Indisponible</button>
      </div>
    </div>
  </div>
</div>
</div>


    <!-- ✅ Modale pour afficher la vidéo -->
    <div v-if="showModal" class="modal fade show" tabindex="-1" style="display: block;" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ currentVideoTitle }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <iframe 
              :src="videoUrl"
              frameborder="0" 
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen 
              width="100%" 
              height="315">
            </iframe>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { jwtDecode } from "jwt-decode";

export default {
  name: "Planning",
  components: { Layout },
  setup() {
    const windowWidth = ref(window.innerWidth);
    const planningData = ref([]);
    const loading = ref(true);

    // ✅ Sélection du cours via le menu déroulant
    const selectedCourse = ref("");

    // ✅ Stocker les références des éléments de cours
    const courseRefs = ref({});

    // ✅ Fonction pour stocker les références des éléments DOM des cours
    const setCourseRef = (el, date) => {
      if (el) {
        courseRefs.value[date] = el;
      }
    };

    // ✅ Fonction pour scroller vers le cours sélectionné
    watch(selectedCourse, async (newVal) => {
  if (!newVal) return;

  await nextTick(); // Assurer que le DOM est bien mis à jour

  const courseElement = courseRefs.value[newVal];

  if (courseElement) {
    // Fait défiler l'élément sélectionné vers le haut
    courseElement.scrollIntoView({ behavior: "smooth", block: "center" });

    // Calcule la position de l'élément par rapport au haut de la fenêtre
    const elementPosition = courseElement.getBoundingClientRect().top;
    const menuHeight = document.querySelector('.fixed-menu')?.offsetHeight || 0;

    // Vérifie si l'élément est sous le menu, si oui, ajuste la position
    if (elementPosition < menuHeight) {
      // Si l'élément est sous le menu, ajuster le décalage pour le rendre visible
      window.scrollTo({
        top: window.scrollY + elementPosition - menuHeight - 10, // Ajuster ici (-10 pour un petit espace)
        behavior: 'smooth',
      });
    }
  } else {
    console.warn("⚠️ Élément introuvable :", newVal);
  }
});







    // ✅ Tri des cours du plus récent au plus ancien
    const sortedPlanningData = computed(() => {
      return [...planningData.value].sort((a, b) => {
        if (!a.formattedDate || !b.formattedDate) return 0;

        // ✅ Extraction propre de la date
        const regex = /\d{2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/;
        const matchA = a.formattedDate.match(regex);
        const matchB = b.formattedDate.match(regex);

        if (!matchA || !matchB) return 0;

        const cleanDateA = matchA[0];
        const cleanDateB = matchB[0];

        // ✅ Conversion des mois en chiffres
        const mois = {
          "janvier": "01", "février": "02", "mars": "03",
          "avril": "04", "mai": "05", "juin": "06",
          "juillet": "07", "août": "08", "septembre": "09",
          "octobre": "10", "novembre": "11", "décembre": "12"
        };

        const [jourA, moisA, anneeA] = cleanDateA.split(" ");
        const [jourB, moisB, anneeB] = cleanDateB.split(" ");

        if (!mois[moisA] || !mois[moisB]) return 0;

        const dateA = new Date(`${anneeA}-${mois[moisA]}-${jourA}`);
        const dateB = new Date(`${anneeB}-${mois[moisB]}-${jourB}`);

        return dateA - dateB; // ✅ Tri du plus récent au plus ancien
      });
    });

    const showModal = ref(false);
    const videoUrl = ref("");
    const currentVideoTitle = ref("");

    const API_URL = "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbwUE9ITcKV4Nbk-TsQ0qh4DUMgp7tOBxJDh_aoy2TfLcy1lduQ_CHgg2t62HkBU39Qo0w/exec";

    const isLoggedIn = computed(() => {
      let jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
      if (!jwt) return false;
      try {
        const decoded = jwtDecode(jwt);
        return decoded.exp * 1000 > Date.now();
      } catch {
        return false;
      }
    });
    const userData = JSON.parse(localStorage.getItem("userData_undefined") || "{}");

// 🔍 Extraire l'email depuis les logs
const email = computed(() => {
  if (userData.logs && Array.isArray(userData.logs)) {
    const emailLog = userData.logs.find(log => log.includes("📡 Requête reçue pour email:"));
    if (emailLog) {
      const match = emailLog.match(/email:\s*([\w.-]+@[\w.-]+\.\w+)/);
      return match ? match[1] : "";
    }
  }
  return "";
});

const prenom = computed(() => userData.nom || "");

console.log("📩 Email extrait :", email.value);
console.log("📩 Prénom extrait :", prenom.value);

    const generateThumbnail = (url) => {
  console.log("🔍 Vérification du lien :", url); // 🔹 Debug

  if (!url || url === "Pas de replay disponible" || url === "pb de connection") return null;

  const match = url.match(/\/d\/(.*?)\//);
  if (!match) {
    console.warn("⚠️ Aucun ID trouvé dans :", url);
    return null;
  }

  return `https://drive.google.com/thumbnail?id=${match[1]}`;
};


    const updateWindowWidth = () => {
      windowWidth.value = window.innerWidth;
    };

    const fetchPlanningData = async () => {
  console.log("🔍 Envoi des paramètres à l'API :", { email: email.value, prenom: prenom.value });

  // 1️⃣ 🔹 Charger d'abord les données en cache si disponibles
  const cachedData = localStorage.getItem("planningData");
  if (cachedData) {
    planningData.value = JSON.parse(cachedData);
    console.log("📂 Chargement des données depuis le cache :", planningData.value);
  }

  // 2️⃣ 🔹 Lancer l'appel API en arrière-plan
  try {
    const response = await axios.get(`${API_URL}?route=planning&email=${encodeURIComponent(email.value)}&prenom=${encodeURIComponent(prenom.value)}`, {
      cache: "no-store"
    });

    console.log("📡 Réponse API reçue :", response.data);

    if (response.data.success && response.data.planning) {
      // 3️⃣ 🔥 Comparer les nouvelles données avec le cache
      const newData = JSON.stringify(response.data.planning);
      if (newData !== localStorage.getItem("planningData")) {
        // 4️⃣ 🚀 Mettre à jour uniquement si les données ont changé
        planningData.value = response.data.planning;
        localStorage.setItem("planningData", newData);
        console.log("✅ planningData mis à jour :", planningData.value);
      } else {
        console.log("🔄 Aucune mise à jour nécessaire, cache inchangé.");
      }
    }
  } catch (error) {
    console.error("❌ Erreur API :", error);
  }
};







    const generateDownloadLink = (url) => {
      if (!url || url === "Pas de replay disponible" || url === "pb de connection") return null;
      const match = url.match(/\/d\/(.*?)\//);
      return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : url;
    };

    const openVideo = (url, title) => {
      if (!url || url === "Aucun aperçu disponible" || url === "pb de connection") return;

      const match = url.match(/\/d\/(.*?)\//);
      videoUrl.value = match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;

      currentVideoTitle.value = title;
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      videoUrl.value = "";
    };

    onMounted(() => {
  fetchPlanningData(); // 🚀 Charge les données instantanément + met à jour en arrière-plan
  window.addEventListener("resize", updateWindowWidth);
});


    onUnmounted(() => {
      window.removeEventListener("resize", updateWindowWidth);
    });

    return { 
      selectedCourse, // ✅ Ajouté ici
      courseRefs, 
      setCourseRef, // ✅ Ajouté ici pour les références des cours
      sortedPlanningData, 
      loading, 
      isLoggedIn, 
      openVideo, 
      closeModal, 
      showModal, 
      videoUrl, 
      currentVideoTitle,
      generateDownloadLink,
      generateThumbnail,
      windowWidth 
    };
  },
};
</script>


<style scoped>
.clickable-row {
  cursor: pointer; /* Indique que la ligne est cliquable */
  transition: background 0.2s;
}

.clickable-row:hover {
  background: rgba(0, 123, 255, 0.1); /* Légère surbrillance au survol */
}



.fixed-menu {
  position: fixed;
  
  top: 10px; /* Position du menu en haut */
  right: 10px; /* Déplace le menu à droite */
  z-index: 9999; /* S'assure que le menu soit au-dessus des autres éléments */
  background-color: #2a2a2a; /* Fond plus foncé pour correspondre au thème */
  padding: 5px 5px; /* Espacement interne ajusté */
  max-width: 28%; /* Largeur maximale */
  border-radius: 12px; /* Coins arrondis plus prononcés */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); /* Ombre douce pour plus de profondeur */
  color: #fff; /* Texte en blanc */
  font-family: 'Arial', sans-serif; /* Police élégante */
  font-size: 10px; /* Taille de police confortable */
  margin-top:4%;
  transition: all 0.3s ease; /* Transition fluide pour les effets */
}
@media screen and (min-width: 1024px) {
  .fixed-menu {
  position: fixed;
  
  top: 10px; /* Position du menu en haut */
  right: 10px; /* Déplace le menu à droite */
  z-index: 9999; /* S'assure que le menu soit au-dessus des autres éléments */
  background-color: #2a2a2a; /* Fond plus foncé pour correspondre au thème */
  padding: 5px 5px; /* Espacement interne ajusté */
  max-width: 28%; /* Largeur maximale */
  border-radius: 12px; /* Coins arrondis plus prononcés */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); /* Ombre douce pour plus de profondeur */
  color: #fff; /* Texte en blanc */
  font-family: 'Arial', sans-serif; /* Police élégante */
  font-size: 10px; /* Taille de police confortable */
  margin-top:4.4%;
  margin-right:2%;
  transition: all 0.3s ease; /* Transition fluide pour les effets */
}}
/* Effet de survol */
.fixed-menu:hover {
  transform: translateY(-5px); /* Élément légèrement surélevé */
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); /* Ombre plus marquée au survol */
}

/* Style pour les éléments à l'intérieur (comme le select) */
.fixed-menu .form-select {
  background-color: #333; /* Fond sombre pour le select */
  color: #fff; /* Texte blanc */

  border: 1px solid #444; /* Bordure sombre */
  border-radius: 8px; /* Coins arrondis plus fins */
  padding: 10px 15px; /* Espacement interne confortable */
  width: 100%; /* Prend toute la largeur disponible */
  font-size: 12px; /* Taille de police ajustée */
  transition: all 0.3s ease;
}

.fixed-menu .form-select:hover {
  background-color: #444; /* Fond plus clair au survol */
  border-color: #d1d1d1; /* Bordure orange au survol */
}

.fixed-menu .form-select:focus {
  outline: none; /* Supprime le contour par défaut */
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.6); /* Effet de focus doux */
  border-color: #dfdfdf; /* Bordure rouge-orangée lorsqu'on est focus */
}

/* Style pour les labels (légèrement plus doux) */
.fixed-menu .form-label {
  color: #ffcc00; /* Texte jaune pour les labels */
  font-size: 13px; /* Taille de police plus petite */
  margin-bottom: 10px; /* Espacement sous l'étiquette */
  font-weight: 500; /* Légèrement plus épais pour un effet moderne */
}

/* Ajouter un effet de transition au bouton au survol */
.fixed-menu .form-select, .fixed-menu .btn {
  transition: all 0.3s ease;
}

.fixed-menu .form-select:focus,
.fixed-menu .btn:hover {
  background-color: #555; /* Effet de survol sur le bouton et le select */
  transform: scale(1.02); /* Légère augmentation de la taille */
}

/* Ajouter des ombres au bouton pour plus de profondeur */
.fixed-menu .btn {
  background-color: #ff5722; /* Rouge orangé pour les boutons */
  color: white;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600; /* Texte plus gras */
  border: none; /* Supprimer la bordure par défaut */
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Ombre subtile */
}

.fixed-menu .btn:hover {
  background-color: #e64a19; /* Un rouge plus foncé au survol */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Ombre plus forte au survol */
  transform: translateY(-3px); /* Élévation subtile au survol */
}


/* Ajouter des ombres au bouton pour plus de profondeur */
.fixed-menu .btn {
  background-color: #007bff; /* Bleu pour les boutons */
  color: white;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600; /* Texte plus gras */
  border: none; /* Supprimer la bordure par défaut */
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Ombre subtile */
}

.fixed-menu .btn:hover {
  background-color: #0056b3; /* Un bleu plus foncé au survol */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Ombre plus forte au survol */
  transform: translateY(-3px); /* Élévation subtile au survol */
}


/* Supprimer le contour bleu au focus pour tous les éléments de formulaire */
.fixed-menu .form-select:focus,
.fixed-menu .form-select:active {
  outline: none; /* Supprime le contour bleu */
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* Remplace-le par un contour subtil bleu si tu veux */
}


@media (max-width: 768px) {
  .fixed-menu {
    position: fixed;
    top: 0;
    left: 0;
    max-width: 100%;
    right: 0;
    margin-top: 8%;
    z-index: 9999; /* S'assurer qu'il soit au-dessus des autres éléments */
    background-color: rgb(41, 41, 41); /* Pour que le fond reste visible */
    padding: 10px 20px; /* Ajuster les espacements pour garder le même aspect */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Légère ombre pour séparer du reste du contenu */
  }
}

.replay-thumbnail {
  width: 100px;
  height: 60px;
  cursor: pointer;
  border-radius: 5px;
  transition: transform 0.2s;
}

.replay-thumbnail:hover {
  transform: scale(1.1);
}

.btn-secondary {
  cursor: not-allowed;
  opacity: 0.6;
}
.replay-thumbnail-lg {
  width: 100%; /* ✅ Pleine largeur pour bien voir */
  max-width: 250px; /* ✅ Pas trop grand sur mobile */
  height: auto;
  cursor: pointer;
  border-radius: 8px;
  transition: transform 0.2s;
}

.replay-thumbnail-lg:hover {
  transform: scale(1.05);
}

.btn-secondary {
  cursor: not-allowed;
  opacity: 0.6;
}
.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.form select
{
position: fixed; /* ✅ Toujours visible */

}
/* ✅ Positionnement de la pastille en haut à droite */
/* ✅ Pastille de présence toujours visible */
.presence-badge {
  position: absolute;
  top: -1px; /* ✅ Rapproche du haut */
  right: -1px; /* ✅ Rapproche du bord droit */
  padding: 5px 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  border-radius: 8px; /* ✅ Arrondi global */
  border-top-right-radius: 0px; /* ✅ Épouse mieux la forme */
  border-bottom-left-radius: 8px; /* ✅ Coin inférieur gauche arrondi */
}


/* ✅ Couleurs dynamiques selon la présence */
.bg-success { background-color: #28a745; } /* 🟢 Présent */
.bg-danger { background-color: #dc3545; } /* 🔴 Absent */
.bg-warning { background-color: #ffc107; } /* 🟡 Reporté */
.bg-primary { background-color: #007bff; } /* 🔵 À venir */
.bg-secondary { background-color: #6c757d; } /* ⚪ Inconnu */


</style>
