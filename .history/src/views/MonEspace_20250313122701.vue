<template>
  <Layout>
    <div class="container mt-4 espace-container">

      <!-- 📌 Conteneur principal -->
      <div class="row justify-content-center">
        <div class="col-lg-12 col-md-10">
          <div class="card glass-card p-4 text-center animated-card">

            <!-- 🚀 Loader (pendant le chargement des données utilisateur) -->
            <div v-if="loading" class="loading-content">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
              <p class="mt-2 text-muted">✨ Patience, nous préparons ton espace... 🚀</p>
            </div>

            <!-- ❌ Message d'erreur -->
            <div v-else-if="error" class="alert alert-danger">
              <strong>❌ Oups !</strong> {{ error }}
            </div>

            <!-- ✅ Contenu affiché une fois chargé -->
            <div v-else class="info-section">
              
              <!-- 🎯 Bloc du prochain objectif -->
              <div class="info-box goal-box text-center">
                <input 
                  v-if="isEditing" 
                  v-model="user.objectif" 
                  class="form-control form-control-sm w-100" 
                  @keyup.enter="updateObjectif"
                >
                <span v-else class="badge bg-warning text-dark fs-5 d-inline-block text-wrap w-100 justify-content-center">
                  💪 <span class="text-break fw-bold lh-sm">{{ user.objectif }}</span>
                  <button v-if="!isEditing" @click="isEditing = true" class="btn btn-link p-0 text-secondary">
                    ✏️
                  </button>
                </span>
                <button v-if="isEditing" @click="updateObjectif" class="btn btn-link p-0 text-success">
                  💾
                </button>
              </div>

              <!-- 📂 Ressources -->
              <div class="info-box resource-box">
                <hr class="my-1 resource-separator">
                <ul class="list-group list-unstyled">
                  <li v-if="user.espace_google_drive" class="resource-item">
                    <a :href="user.espace_google_drive" target="_blank">
                      📂 Mon espace Google Drive
                    </a>
                  </li>
                  <hr class="my-2 resource-separator">
                  <li v-if="user.playlist_youtube" class="resource-item">
                    <a :href="user.playlist_youtube" target="_blank">
                      🎵 Ma playlist YouTube
                    </a>
                  </li>
                </ul>
              </div>

              <!-- 👤 Informations personnelles -->
              <div class="info-box profile-box">
                <button class="btn btn-primary w-100 d-flex align-items-center justify-content-center py-3 fw-bold" @click="showInfos = true">
                  <span class="fs-4">👤</span> <span class="ms-2">Infos personnelles</span>
                </button>
              </div>

              <!-- 📜 Modale Infos personnelles -->
              <div v-if="showInfos" class="overlay" @click="showInfos = false">
                <div class="modal-content" @click.stop>
                  <button class="close-btn" @click="showInfos = false">✖</button>
                  <h5 class="minimal-title">👤 Infos personnelles</h5>
                  <ul class="list-unstyled">
                    
                    <!-- 📧 Email -->
                    <li class="py-2">
                      <strong>Email : </strong>
                      <span v-if="isEditingInfo !== 'email'" @click="editField('email')" class="editable text-primary">
                        {{ user.email }}
                        <i class="bi bi-pencil ms-2 text-muted"></i> <!-- Icône crayon -->
                      </span>
                      <input 
                        v-else
                        v-model="user.email" 
                        type="email" 
                        class="form-control form-control-sm d-inline-block w-auto"
                        @blur="updateInfosPerso"
                        @keyup.enter="updateInfosPerso"
                        ref="emailInput"
                      >
                    </li>

                    <!-- 📞 Téléphone -->
                    <li class="py-2">
                      <strong>Téléphone : </strong>
                      <span v-if="isEditingInfo !== 'telephone'" @click="editField('telephone')" class="editable text-primary">
                        {{ user.telephone }}
                        <i class="bi bi-pencil ms-2 text-muted"></i> 
                      </span>
                      <input 
                        v-else
                        v-model="user.telephone" 
                        type="text" 
                        class="form-control form-control-sm d-inline-block w-auto"
                        @blur="updateInfosPerso"
                        @keyup.enter="updateInfosPerso"
                        ref="telephoneInput"
                      >
                    </li>

                    <!-- Autres informations -->
                    <li><strong>Cursus : </strong> {{ user.cursus }}</li>
                    <li><strong>Trimestre : </strong> {{ user.trimestre || "Non défini" }}</li>
                    <li><strong>Statut : </strong> {{ user.statut }}</li>
                     <div class="d-flex justify-content-center">
  <router-link to="/forgot-password" class="forgot-password-link">
    Modifier mon mot de passe
  </router-link>
</div>

                  </ul>
                </div>
              </div>

            </div> <!-- Fin du contenu chargé -->
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>



<script>
import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode";

export default {
  name: "MonEspace",
  components: { Layout },
  data() {
    return {
      showInfos: false,
      isEditingInfo: false,
      isEditing: false,
      user: {
        prenom: "",
        email: "",
        telephone: "",
        cursus: "",
        trimestre: "",
        objectif: "",
        statut: "",
        espace_google_drive: "",
        playlist_youtube: "",
      },
      loading: true,
      error: "",
      cacheDuration: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
apiBaseURL: "https://script.google.com/macros/s/", // Suppression du proxy côté base URL
routes: {
  GET: "AKfycbyxduceUd1Gs0nVTD--NzcpO_is2Yx79YnPO3UU6Qba01QKSYSJkgjCi83AR-QU0QQZSA/exec",
  POST: "AKfycbyxduceUd1Gs0nVTD--NzcpO_is2Yx79YnPO3UU6Qba01QKSYSJkgjCi83AR-QU0QQZSA/exec"
},
fetchURL(route) {
  return `https://cors-proxy-37yu.onrender.com/${this.apiBaseURL}${this.routes[route]}`;
}

    };
  },
  computed: {
    jwt() {
      return sessionStorage.getItem("jwt") || localStorage.getItem("jwt") || "";
    },
    prenom() {
      return sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
    },
    cacheKey() {
      return `userData_${this.prenom}`;
    },
    cacheExpirationKey() {
      return `${this.cacheKey}_expiration`;
    }
  },
  mounted() {
  this.$nextTick(() => {
    setTimeout(() => { 
      // 🔄 Restauration du prénom dans sessionStorage si absent
      if (!sessionStorage.getItem("prenom") && localStorage.getItem("prenom")) {
        sessionStorage.setItem("prenom", localStorage.getItem("prenom"));
        console.log("🔄 Prénom restauré dans sessionStorage :", sessionStorage.getItem("prenom"));
      }

      this.initializeUser();
    }, 200); 
  });
},
  watch: {
    jwt(newVal) {
      if (newVal) {
        console.log("🔄 JWT détecté, chargement des données...");
        this.loadUserData();
      }
    }
  },
  methods: {
    editField(field) {
    this.isEditingInfo = field; // Active l'édition du champ sélectionné
    this.$nextTick(() => {
      if (field === 'email') this.$refs.emailInput.focus();
      if (field === 'telephone') this.$refs.telephoneInput.focus();
    });
  },

  updateInfosPerso() {
    console.log("💾 Mise à jour des infos :", this.user);

    // 📨 Appel API pour sauvegarder l'email & le téléphone ici...
    
    this.isEditingInfo = null; // Désactive l'édition après la mise à jour
  },

    initializeUser() {
      const jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
      const prenom = sessionStorage.getItem("prenom") || localStorage.getItem("prenom");

      if (!jwt || !prenom) {
        console.log("❌ JWT ou prénom manquant.");
        this.error = "Utilisateur non connecté ou prénom manquant.";
        this.loading = false;
        return;
      }

      console.log("✅ Utilisateur détecté :", prenom);
      this.loadUserData(); // Charge les infos de l'utilisateur
    },
      encodeJWT(jwt) {
    return encodeURIComponent(jwt).replace(/\+/g, "%2B"); // Remplace + par %2B
  },
async fetchUserData(forceUpdate = false) {
  this.loading = true;
  const startTime = Date.now();
  const jwtEncoded = this.encodeJWT(this.jwt);
  const prenomEncoded = encodeURIComponent(this.prenom);

  try {
    const response = await fetch(this.fetchURL("GET") + `?route=recupInfosMembres&jwt=${jwtEncoded}&prenom=${prenomEncoded}`);

    console.log("🔗 URL de la requête :", response.url); // Vérifier si l'URL est correcte
    console.log("📌 Statut HTTP :", response.status); // Vérifier le statut de la réponse

    const contentType = response.headers.get("content-type");
    console.log("📝 Type de contenu :", contentType); // Voir si c'est bien JSON

    const responseText = await response.text();
    console.log("🔍 Réponse brute API :", responseText); // Voir tout ce qui revient de l'API

    if (!response.ok) {
      console.error("❌ Erreur HTTP :", response.status);
      console.error("❌ Réponse complète :", responseText);
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
      console.error("⚠️ La réponse ne semble pas être du JSON !");
      this.error = "Réponse invalide du serveur.";
      return;
    }

    const data = JSON.parse(responseText); // Essaye de parser en JSON
    console.log("✅ Données API :", data);

    if (data) {
      this.user = data;
      this.updateLocalCache(data);
    } else {
      this.error = "Données utilisateur introuvables.";
    }
  } catch (err) {
    console.error("❌ Erreur API :", err.message);
    this.error = "Impossible de récupérer les données.";
  } finally {
    const elapsedTime = Date.now() - startTime;
    const minLoadingTime = 1000;
    const remainingTime = minLoadingTime - elapsedTime;
    setTimeout(() => {
      this.loading = false;
    }, remainingTime > 0 ? remainingTime : 0);
  }
}

,
    updateLocalCache(data) {
  if (data.status === "error") {
    console.error("❌ Erreur API détectée, cache non mis à jour :", data.message);
    return; // ❌ Ne pas stocker les erreurs dans le cache
  }

  const updatedData = { ...JSON.parse(localStorage.getItem(this.cacheKey) || "{}"), ...data };
  localStorage.setItem(this.cacheKey, JSON.stringify(updatedData));
  localStorage.setItem(this.cacheExpirationKey, (Date.now() + this.cacheDuration).toString()); // Expires in 10 mins
  this.user = updatedData;
}
,

    loadUserData(forceUpdate = false) {
      const cachedData = localStorage.getItem(this.cacheKey);
      const cacheExpiration = localStorage.getItem(this.cacheExpirationKey);

      console.log("cachedData:", cachedData);
      console.log("cacheExpiration:", cacheExpiration);
      console.log("forceUpdate:", forceUpdate);

      const jwt = sessionStorage.getItem("jwt") || localStorage.getItem("jwt");
      const prenom = sessionStorage.getItem("prenom");

      if (!jwt || !prenom) {
        console.log("❌ JWT ou prénom manquant.");
        this.error = "JWT ou prénom manquant.";
        this.loading = false;
        return;
      }

      // Si les données sont invalides ou expirées, ou si l'on force la mise à jour
      if (forceUpdate || !cachedData || !cacheExpiration || Date.now() > parseInt(cacheExpiration, 10)) {
        console.log("🔄 Rafraîchissement des données depuis l'API...");
        this.fetchUserData(true); // Forcer un appel API
      } else {
        // Si les données sont valides, les charger depuis le cache
        console.log("⚡ Chargement depuis le cache...");
        const parsedData = JSON.parse(cachedData);
        if (parsedData.status !== "error") {
          this.user = parsedData;
          this.loading = false;
        } else {
          console.error("❌ Données du cache invalides");
          this.fetchUserData(true); // Forcer l'appel API si les données sont invalides
        }
      }
    },

    toggleModal(state) {
      this.showInfos = state;
    },

    async updateUserData(updateData) {
      try {
        console.log("🔄 Mise à jour en cours...");

        const response = await fetch(this.fetchURL("POST"), {

          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ route: "updateEleve", jwt: this.jwt, data: updateData })
        });

        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

        const data = await response.json();
        console.log("✅ Réponse API :", data);

        if (data.status === "success") {
          alert("✅ Mise à jour réussie !");
          this.updateLocalCache(updateData);
        } else {
          alert("❌ Erreur lors de la mise à jour.");
        }
      } catch (err) {
        console.error("❌ Erreur API :", err.message);
        alert("Erreur de connexion au serveur.");
      }
    },

    updateObjectif() {
      this.isEditing = false;
      this.updateUserData({ objectif: this.user.objectif });
    },

    updateInfosPerso() {
      this.isEditingInfo = false;
      this.updateUserData({ email: this.user.email, telephone: this.user.telephone });
    },
  }
};
</script>








<style scoped>
/* ✅ Forcer la couleur du texte en noir */
.info-section,
.resource-box,
.resource-item a {
  color: black !important;
}

/* ✅ S'assurer que le texte des liens reste noir */
.resource-item a {
  color: black !important;
}

.resource-item a:hover {
  background: rgb(220, 220, 220) !important;
  color: black !important;
}


/* ✅ Indique que c'est modifiable */
.editable {
  cursor: pointer;
  padding: 3px 5px;
  transition: all 0.2s ease-in-out;
  border-radius: 5px;
}

/* 🎯 Fond gris clair au survol */
.editable:hover {
  background:rgb(0, 0, 0);
}


/* Écran de chargement */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh; /* Pleine hauteur */
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: white;
  z-index: 9999;
}


/* Champ de modification */
.edit-input {
  width: 100%;
  padding: 5px;
  font-size: 1rem;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 5px;
  outline: none;
}

/* Boutons */
.edit-btn, .save-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  margin-top: 5px;
  cursor: pointer;
  border-radius: 5px;
}

.edit-btn:hover, .save-btn:hover {
  background: #0056b3;
}




/* Container principal */
.espace-container {
  max-width: 1200px;
}


html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow-x: hidden; /* Désactive le scroll horizontal si besoin */
}

/* Effet verre pour la carte principale */
/* 🌟 Style général des cartes */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 6px 15px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 30px;
  color: white;
  transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
}

/* ✨ Effet au survol */
.glass-card:hover {
  transform: translateY(-5px);
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.5);
}

/* 📌 Titres */
.glass-card h5 {
  font-size: 1.4rem;
  font-weight: bold;
  color: #ff8c00;
  text-align: center;
  margin-bottom: 15px;
}

/* 📝 Texte général */
.glass-card p {
  font-size: 1rem;
  color: #ddd;
  text-align: center;
  line-height: 1.6;
}

/* 📂 Ressources */
.resource-box {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

/* 📌 Liens des ressources */
.resource-item a {
  display: block;
  padding: 10px;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  text-decoration: none;
  border-radius: 5px;
  margin-top: 10px;
  transition: background 0.3s, transform 0.2s;
}

.resource-item a:hover {
  background: rgba(255, 140, 0, 0.8);
  color: white;
  transform: translateY(-2px);
}

/* 🎯 Objectif */
.goal-box {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  color: white;
  font-weight: bold;
  text-align: center;
  padding: 15px;
  border-radius: 8px;
  transition: transform 0.2s ease-in-out;
}

/* 🎯 Effet au survol */
.goal-box:hover {
  transform: scale(1.05);
}

/* 📜 Bouton Infos personnelles */
.profile-box button {
  background: linear-gradient(135deg, #ff8c00, #ff5e00);
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease-in-out;
}

.profile-box button:hover {
  background: linear-gradient(135deg, #ff5e00, #ff8c00);
  transform: scale(1.03);
}

/* 📜 Modale */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* 📜 Contenu de la modale */
.modal-content {
  background: white;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  text-align: left;
}

/* 📜 Bouton de fermeture */
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

/* 🏷️ Infos personnelles */
.list-unstyled li {
  font-size: 1rem;
  color: #444;
  padding: 10px 0;
}

/* ✏️ Édition des infos */
.editable {
  cursor: pointer;
  color: #007bff;
  transition: color 0.3s;
}

.editable:hover {
  color: #0056b3;
}

/* 📂 Séparateur */
.resource-separator {
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  width: 100%;
  margin: 10px 0;
}

/* 📱 Responsive */
@media (max-width: 768px) {
  .glass-card {
    padding: 20px;
  }
}

/* Sections d'infos */
.info-section {
  display: flex;
  color:black;
  color:black;
  flex-direction: column;
  gap: 5px;
}

/* Boîtes d'informations */
.info-box {
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.goal-box {
  background: linear-gradient(135deg,rgb(255, 255, 255), #f3cd25);
  color: black;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);

  /* Centrage vertical et horizontal */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Taille minimum pour un bon rendu */
  min-height: 50px;
  padding: 20px;
}

/* Conteneur de chargement */
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




/* Message de chargement */
.loading-container p {
  font-size: 1.1rem;
  font-weight: bold;
  color: #555;
  margin-top: 10px;
  text-align: center;
}

/* Boîtes d'informations */
.info-box {
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);
  text-align: left;
}

/* Objectif */
.goal-box {
  background: linear-gradient(135deg,rgb(255, 255, 255), #f3cd25);
  color: white;
  font-weight: bold;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 20px;
}



/* Ressources */
.resource-box {
  background:rgb(243, 243, 243);
}
.resource-item {
  text-align: center; /* ✅ Centre le lien */
}
.resource-item a {
  display: block;
  padding: 20px;
  color:black;
  background:rgb(255, 255, 255);
  
  text-decoration: none;
  border-radius: 5px;
  margin-top: 10px;
  transition: background 0.3s;
}

.resource-item a:hover {
  background: #ffffff;
  color:black;
}

/* Profil */
.profile-box {
  background: #fff;
}
.resource-separator {
  border: none;
  height: 1px;
  background: radial-gradient(circle, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
  width: 100%;
}



/* Responsive */
@media (max-width: 768px) {
  .glass-card {
    padding: 10px;
  }

  .info-box {
    padding: 8px;
  }
}
</style>
