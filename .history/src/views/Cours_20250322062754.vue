<template>

  <Layout>
    <div class="container-xxl mt-4">
      <h2 class="text-white text-center">📚 Gestion des Cours</h2>

      <!-- ✅ Sélecteur de prénom -->
      <div class="mb-3 text-center">
  <label for="studentSelect" class="text-white">Sélectionner un élève :</label>
<select v-model="selectedStudent" class="form-select mt-2" id="studentSelect">
  <option value="">Tous les élèves</option>
  <option v-for="student in uniqueStudents" :key="student" :value="student">
    {{ student }}
  </option>
</select>

</div>

<!-- ✅ Bouton de suppression -->
<div class="text-center mt-3" v-if="selectedStudent">
  <button @click="supprimerCours" class="btn btn-danger">❌ Supprimer les cours de {{ selectedStudent }}</button>
</div>


      <!-- ✅ Chargement -->
      <div v-if="loading" class="d-flex flex-column align-items-center mt-4">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <p class="text-muted">Chargement des cours...</p>
      </div>

      <!-- ✅ Message si aucun cours trouvé -->
      <div v-if="!loading && filteredCours.length === 0" class="alert alert-warning text-center mt-3">
        <p>Aucun cours trouvé.</p>
      </div>
<!-- ✅ Bouton pour activer/désactiver le filtre -->
<div class="mb-3 d-flex align-items-center gap-2">
  <input 
    type="checkbox" 
    id="filterUpcoming" 
    v-model="filterUpcoming"
    class="form-check-input"
  />
  <label for="filterUpcoming" class="form-check-label">
    Afficher uniquement les cours à venir 📅
  </label>
</div>
<!-- ✅ Sélecteur de semaine -->
<div class="mb-3 text-center">
  <label for="weekSelect" class="text-white">Sélectionner une semaine :</label>
  <select v-model="selectedWeek" class="form-select mt-2" id="weekSelect">
    <option value="">Toutes les semaines</option>
    <option v-for="week in weeks" :key="week.start" :value="week">
      {{ week.label }}
    </option>
  </select>
</div>
<div v-if="successMessage" class="alert alert-success text-center mt-3">
  {{ successMessage }}
</div>
<div class="d-flex justify-content-center gap-2 mt-2">
  <button class="btn btn-primary" @click="goToNextWeek">📅 Prochaine semaine</button>
</div>

      <!-- ✅ Tableau des cours -->
      <div v-if="!loading && filteredCours.length > 0" class="table-responsive mt-3">
<div v-if="!loading && filteredCours.length > 0" class="table-responsive mt-3">
  <table class="table table-hover shadow-sm">
    <thead class="table-dark">
      <tr>
        <th scope="col">📆 Date & Heure</th>
        <th scope="col">🎸 Élève</th>
        <th scope="col">🔗 Lien Meet</th>
        <th scope="col">📝 Commentaires</th>
        <th scope="col">📄 Synthèse</th>
        <th scope="col">👀 Présence</th>
      </tr>
    </thead>
    <tbody>
      <tr 
  v-for="(cours, index) in filteredCours" 
  :key="index"
  @click="openEditModal(cours)" 
  class="clickable-row"
  :class="{
    'past-course': isPastCourse(cours), // ✅ Ajoute la classe past-course si le cours est passé
    'future-course': !isPastCourse(cours), // ✅ Sinon, future-course
    'selected-row': editedCours && editedCours.AncienneDate === cours['Date et heure'] // ✅ Surbrillance sur cours sélectionné
  }"
>



        <!-- ✅ Format compact de la date -->
        <td><strong>{{ formatCompactDate(cours['Date et heure']) }}</strong></td>

        <!-- ✅ Prénom de l'élève -->
        <td>{{ cours.Prénom }}</td>

        <!-- ✅ Lien Google Meet avec icône cliquable -->
        <td>
          <a :href="cours['Lien Google Meet']" target="_blank" class="btn btn-primary btn-sm">
            📎 Ouvrir
          </a>
        </td>

        <!-- ✅ Commentaires -->
        <td>{{ cours.Commentaires || "Aucun commentaire" }}</td>

        <!-- ✅ Synthèse -->
        <td>{{ cours.Synthèse || "Non renseignée" }}</td>

        <!-- ✅ Case à cocher pour la présence -->
<td>
  <input 
  type="checkbox" 
  :checked="Boolean(cours.Présence)" 
  @change.prevent="updatePresence(cours, $event.target.checked)" 
  @click.stop
/>

</td>


      </tr>
    </tbody>
  </table>
</div>



      </div>
    </div>
  </Layout>
  <!-- ✅ MODAL DE MODIFICATION -->
<div v-if="editModalOpen" class="modal show d-block" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Modifier le cours de {{ editedCours.Prénom }}</h5>
        <button type="button" class="btn-close" @click="closeEditModal"></button>
      </div>
      <div class="modal-body">
      <label class="form-label">Date et heure :</label>
<input type="datetime-local" v-model="editedCours['Date et heure']" class="form-control" />


        <label class="form-label mt-2">Lien Google Meet :</label>
        <input type="url" v-model="editedCours['Lien Google Meet']" class="form-control" />

        <label class="form-label mt-2">Lien Replay :</label>
        <input type="url" v-model="editedCours['Lien Replay']" class="form-control" />

        <label class="form-label mt-2">Trimestre :</label>
        <select v-model="editedCours.Trimestre" class="form-select">
          <option value="trimestre 1">Trimestre 1</option>
          <option value="trimestre 2">Trimestre 2</option>
          <option value="trimestre 3">Trimestre 3</option>
        </select>
     
<!-- ✅ Champ pour modifier les commentaires -->
<label class="form-label mt-2">📝 Commentaires :</label>
<textarea 
  v-model="editedCours.Commentaires" 
  class="form-control" 
  rows="3" 
  placeholder="Ajouter un commentaire..."
></textarea>

<!-- ✅ Champ pour modifier la synthèse -->
<label class="form-label mt-2">📄 Synthèse :</label>
<textarea 
  v-model="editedCours.Synthèse" 
  class="form-control" 
  rows="3" 
  placeholder="Ajouter une synthèse..."
></textarea>


      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeEditModal">Annuler</button>
        <button class="btn btn-success" @click="updateCours">✅ Enregistrer</button>
      </div>
      
    </div>
  </div>
</div>

</template>

<script>
import Layout from "../views/Layout.vue";
import axios from "axios";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getValidToken } from "@/utils/api"; // 🔐 Import sécurisé

export default {
  name: "Cours",
  components: { Layout },
  setup() {
    const filterUpcoming = ref(false);
    const router = useRouter();
    const coursData = ref([]);
    const loading = ref(true);
    const deleting = ref(false);
    const updating = ref(false);
    const selectedStudent = ref("");
    const editModalOpen = ref(false);
    const editedCours = ref({});
    const selectedWeek = ref(""); // Stocke la semaine sélectionnée
    const successMessage = ref("");
    const isPastCourse = (cours) => {
  if (!cours || !cours["Date et heure"]) return false;
  const courseDate = new Date(cours["Date et heure"]);
  return courseDate.getTime() < Date.now(); // ✅ Compare avec le timestamp actuel
};

const goToNextWeek = () => {
  if (!selectedWeek.value || weeks.value.length === 0) return;

  const currentIndex = weeks.value.findIndex(week => week.start.getTime() === selectedWeek.value.start.getTime());

  if (currentIndex !== -1 && currentIndex < weeks.value.length - 1) {
    selectedWeek.value = weeks.value[currentIndex + 1]; // ✅ Sélectionne la semaine suivante
  }
};

    const showSuccessMessage = (message) => {
      successMessage.value = message;
      setTimeout(() => {
        successMessage.value = "";
      }, 4000);
    };

    const API_URL =
      "https://cors-proxy-37yu.onrender.com/https://script.google.com/macros/s/AKfycbyxduceUd1Gs0nVTD--NzcpO_is2Yx79YnPO3UU6Qba01QKSYSJkgjCi83AR-QU0QQZSA/exec";

    // ✅ Vérifie si l'utilisateur est connecté
    const isLoggedIn = computed(() => !!localStorage.getItem("jwt"));
    if (!isLoggedIn.value) {
      router.replace("/login");
    }

    // ✅ Récupérer les cours depuis Google Sheets
    const fetchCours = async (noCache = false) => {
  loading.value = true;
  try {
    const jwt = await getValidToken(); // 🔒 Ajoute le token sécurisé
    const url = `${API_URL}?route=suiviCours${noCache ? `&t=${Date.now()}` : ""}`;
    const response = await axios.get(url);
    if (response.data.status === "success") {
      console.log("📡 Données reçues depuis l'API :", response.data.data); // 🔍 Vérifier les données
      coursData.value = response.data.data;
    } else {
      console.error("❌ Erreur API:", response.data.message);
    }
  } catch (error) {
    console.error("❌ Erreur lors du chargement des cours:", error);
  } finally {
    loading.value = false;
  }
};


    // ✅ Liste unique des prénoms
    const uniqueStudents = computed(() => {
      if (!coursData.value || coursData.value.length === 0) return [];
      const students = new Set(
        coursData.value
          .map((cours) => cours.Prénom?.trim())
          .filter(Boolean) // Supprime les valeurs vides
      );
      return Array.from(students).sort();
    });

    // ✅ Générer les semaines disponibles
    const weeks = computed(() => {
  const uniqueWeeks = new Map(); // Utilisation de Map pour éviter les doublons

  coursData.value.forEach((cours) => {
    if (cours["Date et heure"]) {
      const date = new Date(cours["Date et heure"]);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Lundi de la semaine
      startOfWeek.setHours(0, 0, 0, 0); // Réinitialise l'heure pour éviter les différences

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche de la semaine
      endOfWeek.setHours(23, 59, 59, 999); // Fin de journée pour éviter les erreurs de comparaison

      const key = `${startOfWeek.toISOString()}_${endOfWeek.toISOString()}`; // Clé unique

      if (!uniqueWeeks.has(key)) {
        uniqueWeeks.set(key, {
          start: startOfWeek,
          end: endOfWeek,
          label: `Semaine du ${startOfWeek.getDate()} ${startOfWeek.toLocaleString("fr", { month: "long" })}`
        });
      }
    }
  });

  // ✅ Retourne les semaines triées par date de début
  return Array.from(uniqueWeeks.values()).sort((a, b) => a.start - b.start);
});

const selectClosestWeek = () => {
  if (weeks.value.length === 0) return;

  const now = new Date();

  // ✅ Trouver la première semaine qui contient AU MOINS un cours futur
  let closestWeek = weeks.value.find(week => {
    return coursData.value.some(cours => {
      const courseDate = new Date(cours["Date et heure"]);
      return courseDate >= now && courseDate >= week.start && courseDate <= week.end;
    });
  });

  // ✅ Si aucune semaine avec un cours futur n’est trouvée, prendre la première semaine future
  if (!closestWeek) {
    closestWeek = weeks.value.find(week => now < week.start);
  }

  // ✅ Appliquer la semaine trouvée
  if (closestWeek) {
    selectedWeek.value = closestWeek;
  }
};


    // ✅ Filtrage des cours par élève, semaine et cours à venir
    const filteredCours = computed(() => {
  let filtered = [...coursData.value];

  if (selectedStudent.value) {
    filtered = filtered.filter(
      (cours) => cours.Prénom?.trim() === selectedStudent.value.trim()
    );
  }

  if (filterUpcoming.value) {
    const now = new Date();
    filtered = filtered.filter((cours) => {
      const courseDate = new Date(cours["Date et heure"]);
      return courseDate > now;
    });
  }

  if (selectedWeek.value) {
    filtered = filtered.filter((cours) => {
      const courseDate = new Date(cours["Date et heure"]);
      return (
        courseDate >= new Date(selectedWeek.value.start) &&
        courseDate <= new Date(selectedWeek.value.end)
      );
    });
  }

  // ✅ Trier par date et heure dans l'ordre chronologique
  filtered.sort((a, b) => new Date(a["Date et heure"]) - new Date(b["Date et heure"]));

  return filtered;
});


    // ✅ Supprimer les cours d'un élève
    const supprimerCours = async () => {
      if (!selectedStudent.value) {
        alert("❌ Sélectionnez un élève !");
        return;
      }

      const confirmation = confirm(`Voulez-vous vraiment supprimer tous les cours de ${selectedStudent.value} ?`);
      if (!confirmation) return;

      deleting.value = true;
      try {
        const requestBody = JSON.stringify({ route: "supprimerCoursEleve", prenom: selectedStudent.value });

        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody
        });

        const result = await response.json();
        if (result.status === "success") {
          showSuccessMessage(`✅ Les cours de ${selectedStudent.value} ont été supprimés avec succès !`);
          await fetchCours(true);
        } else {
          alert(`❌ Erreur : ${result.message}`);
        }
      } catch (error) {
        console.error("❌ Erreur de suppression :", error);
        alert("❌ Une erreur est survenue.");
      } finally {
        deleting.value = false;
      }
    };

    // ✅ Ouvrir la modale d'édition
    const openEditModal = (cours) => {
  editedCours.value = { ...cours };

  // ✅ Sauvegarde la date d'origine pour que l'API puisse retrouver le cours
  editedCours.value.AncienneDate = cours["Date et heure"];

  // ✅ Vérifie et reformate la date pour l'input datetime-local
  if (editedCours.value["Date et heure"]) {
    const dateObj = new Date(editedCours.value["Date et heure"]);
    
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const hours = String(dateObj.getHours()).padStart(2, "0");
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");

      editedCours.value["Date et heure"] = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      console.error("❌ Date invalide :", editedCours.value["Date et heure"]);
      editedCours.value["Date et heure"] = "";
    }
  }

  editModalOpen.value = true;
};



    // ✅ Fermer la modale d'édition
    const closeEditModal = () => {
      editModalOpen.value = false;
      editedCours.value = {};
    };

    // ✅ Met à jour un cours
    const updateCours = async () => {
  if (!editedCours.value.Prénom || !editedCours.value["Date et heure"]) {
    alert("❌ Tous les champs doivent être remplis !");
    return;
  }

  updating.value = true;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        route: "updateCours",
        cours: {
          ...editedCours.value,
          AncienneDate: editedCours.value.AncienneDate // ✅ Ajoute l'ancienne date
        },
      }),
    });

    const result = await response.json();

    if (result.status === "success") {
      showSuccessMessage("✅ Cours mis à jour avec succès !");
      await fetchCours(true);
      closeEditModal(); // ✅ Ferme la modale après la mise à jour
    } else {
      alert("❌ Erreur : " + result.message);
    }
  } catch (error) {
    console.error("❌ Erreur de mise à jour :", error);
    alert("❌ Une erreur est survenue.");
  } finally {
    updating.value = false;
  }
};



    // ✅ Format compact de la date
    const formatCompactDate = (isoDate) => {
      if (!isoDate) return "Date invalide";
      const dateObj = new Date(isoDate);
      if (isNaN(dateObj.getTime())) return "Date invalide";

      return `${dateObj.getDate().toString().padStart(2, "0")}/${(dateObj.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${dateObj.getFullYear()} à ${dateObj.getHours()
        .toString()
        .padStart(2, "0")}H${dateObj.getMinutes().toString().padStart(2, "0")}`;
    };

    onMounted(async () => {
    try {
      const jwt = await getValidToken(); // 🔒 Récupère le token sécurisé
      if (!jwt) throw new Error("Utilisateur non connecté");
    } catch (error) {
      console.warn("🔐 Redirection forcée vers login");
      router.replace("/login");
      return;
    }

    await fetchCours();
    selectClosestWeek();
  });

    return {
      coursData, loading, deleting, updating, selectedStudent, filterUpcoming, filteredCours,
      supprimerCours, openEditModal, closeEditModal, updateCours, editModalOpen,
      editedCours, formatCompactDate, uniqueStudents, selectedWeek, weeks, successMessage, isPastCourse
    };
  },
};
</script>


<style scoped>

/* ✅ Permet à la table de s'adapter au contenu */
.table {
  table-layout: auto; /* Ajuste automatiquement la largeur */
  width: 100%;
}

/* ✅ Empêche le lien Meet d'être trop large */
.table td:nth-child(3), 
.table th:nth-child(3) {
  width: 1%; /* Laisse le navigateur ajuster en fonction du contenu */
  white-space: nowrap; /* Empêche le texte de passer à la ligne */
}

/* ✅ Empêche d'autres colonnes d'être trop larges */
.table td, 
.table th {
  max-width: 200px; /* Limite la largeur max pour éviter des colonnes trop grandes */
  overflow: hidden;
  text-overflow: ellipsis; /* Coupe le texte trop long */
  white-space: nowrap; /* Empêche le retour à la ligne */
}

/* ✅ Forcer les couleurs des cours passés et futurs */
.past-course td, .past-course th {
  background-color: #f8d7da !important; /* Rouge clair */
  color: #721c24 !important;
}

.future-course td, .future-course th {
  background-color: #d4edda !important; /* Vert clair */
  color: #155724 !important;
}


/* ✅ Ajuste la largeur et hauteur de la modale pour qu'elle soit bien centrée */
.modal-dialog {
  max-width: 50vw; /* Réduit la largeur pour éviter un effet trop grand sur desktop */
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh; /* Centre verticalement */
}
/* ✅ Cours passés (gris clair) */
/* ✅ Cours passés (rouge clair) */
.past-course {
  background-color: #f8d7da !important; /* Rouge clair */
  color: #721c24 !important;
}

/* ✅ Cours futurs (vert clair) */
.future-course {
  background-color: #d4edda !important; /* Vert clair */
  color: #155724 !important;
}

/* ✅ Ajouter une bordure pour plus de visibilité */
.past-course, .future-course {
  border-left: 5px solid;
}

/* ✅ Couleurs pour la bordure */
.past-course {
  border-color: #f5c6cb; /* Rouge */
}

.future-course {
  border-color: #c3e6cb; /* Vert */
}

/* ✅ Effet de surbrillance pour la ligne active */
.selected-row {
  background-color: #ffc107 !important; /* Jaune clair */
  color: #212529 !important; /* Texte foncé pour lisibilité */
}


/* ✅ Contrôle la hauteur pour éviter d'être rogné */
.modal-content {
  max-height: 85vh; /* Ajuste pour éviter le rognage */
  overflow-y: auto; /* Active le défilement si besoin */
}

.modal-body {
  max-height: 60vh; /* Permet le défilement interne si nécessaire */
  overflow-y: auto;
}


/* ✅ Meilleur affichage sur mobile */
@media (max-width: 768px) {
  .modal-dialog {
    max-width: 90vw; /* Largeur plus grande pour mobiles */
    margin: 10px;
  }

  .modal-content {
    max-height: 85vh; /* Ajuste la hauteur pour éviter le rognage */
  }
}
/* ✅ Effet visuel sur la ligne sélectionnée */
.selected-row {
  background-color: #ffc107 !important; /* Jaune clair */
  color: #212529; /* Texte foncé pour lisibilité */
}

/* ✅ Fixe le problème de rognage en bas */
.modal-body {
  max-height: 60vh; /* Permet le défilement interne */
  overflow-y: auto;
  padding-bottom: 20px;
}

/* ✅ Fixe les boutons pour qu'ils restent visibles */
.modal-footer {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #ddd;
}


/* ✅ Style du filtre "Afficher uniquement les cours à venir" */
#filterUpcoming {
  accent-color: #ffcc00; /* ✅ Changer la couleur de la case à cocher */
}

label[for="filterUpcoming"] {
  color: #ffffff; /* ✅ Assurer une bonne lisibilité sur fond sombre */
  font-weight: bold;
}
/* ✅ Améliorer la visibilité du filtre */
.filter-container {
  background-color: rgba(255, 255, 255, 0.1); /* ✅ Légère transparence */
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ffffff50; /* ✅ Bordure discrète */
}

.loading-container {
  position: fixed;  /* Rend le loader toujours visible */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);  /* Centre parfaitement */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8); /* Fond légèrement opaque pour la visibilité */
  z-index: 1000; /* Assure que le loader passe au-dessus */
}

.spinner-border {
  width: 2rem;
  height: 2rem;
  color: red !important;
}

h2 {
  font-weight: bold;
  color: #ffffff;
}

/* ✅ Amélioration du style du tableau */
.table-responsive {
  max-height: 70vh; /* Ajuste selon ton besoin */
  overflow-y: auto; /* Active le scroll vertical si nécessaire */
}


.table {
  border-radius: 10px;
  overflow: hidden;
  font-size: 1rem;
}

.table th, .table td {
  padding: 12px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.table th {
  background-color: #212529;
  color: #ffffff;
}

.table-hover tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

/* ✅ Ajustements pour mobile */
@media (max-width: 768px) {
  .table th, .table td {
    padding: 8px;
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .container-xxl {
    padding-left: 5px;
    padding-right: 5px;
  }
}
.container-xxl {
  padding-bottom: 50px; /* Ajoute un espace en bas pour éviter le rognage */
}

</style>
