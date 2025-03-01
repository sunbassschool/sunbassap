<template>
  <Layout>
    <div class="container d-flex flex-column align-items-center justify-content-center">
      
      <!-- 🔄 Spinner affiché pendant le chargement -->
      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
        <p class="mt-3">Chargement en cours...</p>
      </div>

      <!-- 🔒 Si l'élève n'est pas connecté -->
      <div v-else-if="!isLoggedIn" class="content text-center">
        <h2 class="mb-4">Bienvenue sur l'application SunBassSchool !</h2>
        <p class="text-muted mb-5">Pour accéder à vos informations, vous devez vous connecter ou vous inscrire.</p>
        
        <div class="d-flex justify-content-center gap-4">
          <button @click="redirectToRegisterform" class="btn btn-primary">S'inscrire</button>
          <button @click="redirectToLogin" class="btn btn-secondary">Se connecter</button>
        </div>
      </div>

      <!-- ✅ Contenu principal si l'élève est connecté -->
      <div v-else class="content">

        <div 
          v-for="(card, index) in cards" 
          :key="index" 
          class="fade-in position-relative"
          :class="{ 'first-card': index === 0 }"
        >
          <div class="dashboard-card rounded-3 p-4 d-flex align-items-center">
            <i :class="card.icon" class="icon me-3"></i>
            <div>
              <h3 class="h5 mb-1 d-flex align-items-center">
                {{ card.title }}

                <!-- 🔄 Bouton mise à jour visible uniquement sur la première carte -->
                <button 
  v-if="index === 0 || index === 1" 
  @click="forceUpdateCache" 
  class="update-cache-btn ms-2"
>
  <i class="bi bi-arrow-clockwise"></i>
</button>


              </h3>
              <p class="text-muted mb-0" v-html="card.text"></p>
            </div>
          </div>
          <div v-if="index < cards.length - 1" class="separator"></div>
        </div>
      </div>

    </div>
  </Layout>
</template>


<script>
import Layout from "../views/Layout.vue";
import { jwtDecode } from "jwt-decode"; // 📌 Ajout du décodage du JWT

export default {
  name: "Dashboard",
  components: { Layout },
  data() {
    return {
      cards: [],
      isLoading: true, // 🚀 Ajout du spinner au chargement
      cacheDuration: 24 * 60 * 60 * 1000, // ⏳ Durée du cache : 1 jour
      apiBaseURL: "https://script.google.com/macros/s/",
      routes: {
        GET: "AKfycbyONssEhZB8DzTkDij1hwvUXVdNSCe3JnqjAs88hCVC1-oNHSS9cPthQGA0ZJaNVlrZfA/exec"
      }
    };
  },
  computed: {
    isLoggedIn() {
      let jwt = sessionStorage.getItem("jwt");

      if (!jwt) {
        console.log("⚠️ Aucun JWT en sessionStorage, récupération depuis localStorage...");
        jwt = localStorage.getItem("jwt");

        if (jwt) {
          sessionStorage.setItem("jwt", jwt);
          console.log("✅ JWT restauré dans sessionStorage :", jwt);
        }
      }

      if (!jwt) {
        console.warn("❌ Aucun JWT trouvé.");
        return false;
      }

      try {
        const decoded = jwtDecode(jwt);
        return decoded.exp * 1000 > Date.now(); // 🔥 Vérifie si le JWT est expiré
      } catch (error) {
        console.error("🚨 JWT invalide :", error);
        return false;
      }
    },
    email() {
      return sessionStorage.getItem("email") || localStorage.getItem("email") || "";
    },
    prenom() {
      return sessionStorage.getItem("prenom") || localStorage.getItem("prenom") || "";
    },
    cacheKey() {
      return `dashboard_${this.email}_${this.prenom}`;
    },
    cacheExpirationKey() {
      return `${this.cacheKey}_timestamp`;
    }
  },
  mounted() {
    console.log("✅ Vérification du JWT au chargement...");
    if (this.isLoggedIn) {
      this.fetchStudentData();
    } else {
      this.isLoading = false;
    }
  },
  methods: {
    async forceUpdateCache() {
      console.log("🔄 Mise à jour forcée des données...");

      localStorage.removeItem(this.cacheKey);
      localStorage.removeItem(this.cacheExpirationKey);

      this.isLoading = true;
      await this.fetchStudentData();
    },

    async fetchStudentData() {
      if (!this.isLoggedIn) {
        console.warn("❌ Impossible de récupérer les données car l'utilisateur n'est pas connecté.");
        this.isLoading = false;
        return;
      }

      const cachedData = localStorage.getItem(this.cacheKey);
      const cacheExpiration = localStorage.getItem(this.cacheExpirationKey);

      if (cachedData && cacheExpiration && Date.now() - cacheExpiration < this.cacheDuration) {
        console.log("⚡ Chargement des données depuis le cache :", cachedData);

        try {
          const parsedData = JSON.parse(cachedData);
          if (this.isCacheValid(parsedData)) {
            this.updateData(parsedData);
            this.isLoading = false;
            return;
          } else {
            console.warn("⚠️ Cache corrompu détecté, suppression...");
            localStorage.removeItem(this.cacheKey);
            localStorage.removeItem(this.cacheExpirationKey);
          }
        } catch (error) {
          console.error("❌ Erreur lors du parsing du cache :", error);
        }
      }

      try {
        console.log("🌐 Récupération des données depuis l'API...");
        const response = await fetch(
          `${this.apiBaseURL}${this.routes.GET}?route=planning&email=${this.email}&prenom=${this.prenom}`
        );
        const data = await response.json();

        console.log("📥 Données reçues de l'API :", data);

        if (data.status === "error") {
          console.error("❌ Erreur API détectée :", data.message);
          this.displayError();
          return;
        }

        localStorage.setItem(this.cacheKey, JSON.stringify(data));
        localStorage.setItem(this.cacheExpirationKey, Date.now());

        this.updateData(data);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des données :", error);
        this.displayError();
      }

      this.isLoading = false;
    },

    isCacheValid(data) {
      if (!data || typeof data !== "object") {
        console.error("❌ Cache invalide détecté : Données absentes ou incorrectes.");
        return false;
      }

      if (data.status === "error" || data.error) {
        if (data.error === "Aucun lien Meet trouvé") {
          console.warn("⚠️ Aucun lien Meet trouvé, mais ce n'est pas une erreur critique.");
          return true;
        }

        console.error("❌ Cache invalide détecté :", data.error || data.message);
        return false;
      }

      const hasValidProchainCours =
        data.prochainCours &&
        typeof data.prochainCours === "object" &&
        typeof data.prochainCours.date === "string" &&
        typeof data.prochainCours.cours === "string";

      const hasValidObjectif = typeof data.objectif === "string";

      if (!hasValidProchainCours && !hasValidObjectif) {
        console.error("❌ Cache invalide : Données essentielles manquantes.");
        return false;
      }

      return true;
    },

    updateData(data) {
      const prochainCours = data.prochainCours
        ? `${data.prochainCours.date} - ${data.prochainCours.cours} Lien d'accès : <a href="${data.prochainCours.meet}" target="_blank">Lien Meet</a>`
        : "Pas de cours prévu.";

      this.cards = [
        {
          icon: "bi bi-calendar-event",
          title: "Prochain Cours",
          text: prochainCours
        },
        {
          icon: "bi bi-flag",
          title: "Objectif actuel",
          text: `${data.objectif || "Aucun objectif défini"}`
        }
      ];
    },

    displayError() {
      this.cards = [
        {
          icon: "bi bi-calendar-event",
          title: "Prochain Cours",
          text: "Impossible de récupérer les données du prochain cours."
        },
        {
          icon: "bi bi-flag",
          title: "Objectif actuel",
          text: "Impossible de récupérer l'objectif de l'élève."
        }
      ];
    },

    redirectToRegisterform() {
      this.$router.push("/registerform");
    },
    redirectToLogin() {
      this.$router.push("/login");
    }
  }
};
</script>




<style scoped>
/* 🔄 Bouton de mise à jour du cache */
.update-cache-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 1rem;
  color: #1e90ff;
  cursor: pointer;
  transition: opacity 0.3s ease-in-out;
}

.update-cache-btn:hover {
  opacity: 0.7;
}

/* Conteneur principal */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* Centrage vertical */
  padding: 40px 20px;
  background-color:rgb(34, 34, 34);
    justify-content: center; /* Centre verticalement */
  min-height: 100vh; /* Toute la hauteur de la fenêtre */
 
 
}

/* Contenu centré et limité */
.content {
  width: 100%;
   flex-grow:1;
  max-width: 800px;
  text-align: center;
}

/* Message d'accueil */
.text-center {
  color: #ffffff;
}

/* Cartes */
/* 📌 Style général des cartes */
.dashboard-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); /* Effet verre */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Bordure subtile */
  box-shadow: 4px 4px 15px rgba(0, 0, 0, 0.3), inset -4px -4px 10px rgba(255, 255, 255, 0.05); /* Ombre douce */
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
  border-radius: 12px; /* Coins légèrement arrondis */
  margin: 15px 0; /* Ajout d’espace entre les cartes */
  width: 100%;
  color:white;
  transition: all 0.3s ease-in-out;
  backdrop-filter: blur(8px); /* Effet de flou pour le style "Glassmorphism" */
}

/* ✨ Effet au survol */
.dashboard-card:hover {
  transform: translateY(-5px);
  box-shadow: 6px 6px 20px rgba(0, 0, 0, 0.5), inset -2px -2px 8px rgba(255, 255, 255, 0.05);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.07));
}

/* 🟠 Icônes plus visibles */
.icon {
  font-size: 2.5rem;
  color: #ff8c00; /* Icône colorée pour plus d’impact */
  background: rgba(255, 140, 0, 0.15);
  padding: 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  height: 55px;
  margin-right: 15px;
}
.this.card

/* 📌 Amélioration des titres */
.dashboard-card h3 {
  font-size: 1.2rem;
  font-weight: bold;
  color: white!important;
}

/* 📌 Texte plus lisible */
.dashboard-card p {
  font-size: 1rem;
  color: #fff!important;
   font-size: 1rem; /* Taille équilibrée */
  font-weight: 400; /* Poids de police normal */
   text-align: left; /* Alignement naturel */
  line-height: 1.5; /* Espacement optimal */
  letter-spacing: 0.3px; /* Espacement subtil pour la lisibilité */
  transition: color 0.3s ease-in-out;
  
}


/* 🔥 Barre animée sous le texte */
.dashboard-card p::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0;
  height: 2px;
  background-color: #ff8c00;
  transition: width 0.3s ease-in-out;
}

.dashboard-card:hover p {
  color: #ff8c00;
}

.dashboard-card:hover p::after {
  width: 100%;
}


.dashboard-card:hover p {
  text-shadow: 0 0 15px rgba(255, 140, 0, 0.9);
}
.dashboard-card p::first-letter {
  font-size: 1.2rem;
  font-weight: bold;
  color: #ff8c00; /* Première lettre en orange */
}
/* 🔽 Séparateur entre les cartes */
.separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}


/* Effet d'apparition fluide */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Style des boutons */
button {
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 5px;
  transition: background-color 0.3s ease-in-out;
}

.btn-primary {
  background-color: #1e90ff;
  border: none;
  color: white;
}

.btn-secondary {
  background-color: #444;
  border: none;
  color: white;
}

button:hover {
  opacity: 0.8;
}

/* Ajustement du texte */
.text-light {
  color: #bbb;
}
</style>

