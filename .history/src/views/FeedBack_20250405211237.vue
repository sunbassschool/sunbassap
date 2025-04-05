<template>
    <Layout>
      <div class="container mt-4">
  
        <h2 class="text-white mb-4">📋 Tes Feedbacks</h2>
  
        <!-- 🔄 Chargement -->
        <div v-if="feedbackLoading" class="text-center text-light">
          <div class="spinner-border custom-spinner"></div>
          <p>Chargement des feedbacks...</p>
        </div>
  
        <!-- ❌ Erreur -->
        <div v-if="feedbackError" class="alert alert-danger">
          {{ feedbackError }}
        </div>
  
        <!-- ✅ Feedbacks existants -->
        <div v-if="feedbacks.length && !feedbackLoading">
          <div 
  v-for="fb in feedbacks" 
  :key="fb.ID"
  class="bg-dark text-light border rounded p-3 mb-4"
>
  <!-- 🎖️ Type + Date -->
  <div class="d-flex justify-content-between align-items-center mb-2">
    <span class="badge" :class="fb.Type === 'Prof' ? 'bg-primary' : 'bg-secondary'">
      {{ fb.Type }}
    </span>
    <small class="text-white-50">{{ formatDate(fb.Date_Publication) }}</small>
  </div>

  <!-- 💬 Contenu principal -->
  <div class="formatted-content mb-2" v-html="nettoyerContenu(fb.Contenu)"></div>

  <!-- 🧾 Statut + Auteur -->
  <div class="d-flex justify-content-between align-items-center mb-2">
    <span :class="fb.Statut === 'Validé' ? 'text-success' : 'text-warning'">
      {{ fb.Statut }}
    </span>
    <span class="small text-white-50">Par {{ fb.Auteur }}</span>
  </div>

  <!-- ✅ Checkbox "Marquer comme lu" -->
  <div v-if="fb.Type === 'Prof' && fb.Statut !== 'Validé'" class="form-check mt-2">
    <input 
      class="form-check-input"
      type="checkbox"
      :id="'feedback-' + fb.ID"
      :checked="fb.Statut === 'Validé'"
      :disabled="fb.Statut === 'Validé'"
      @change="markAsRead(fb.ID)"
    >
    <label class="form-check-label text-light" :for="'feedback-' + fb.ID">
      Marquer comme lu
    </label>
  </div>

  <!-- 🗑️ Suppression -->
  <div v-if="fb.Auteur === email" class="text-end mt-2">
    <button class="btn btn-sm btn-danger" @click="deleteFeedback(fb.ID)">
      Supprimer 🗑️
    </button>
  </div>

  <!-- 🧾 Réponses -->
  <div v-if="fb.reponses?.length" class="mt-3">
    <div v-for="rep in fb.reponses" :key="rep.ID" class="bg-secondary text-light p-2 mb-2 rounded">
      <div class="d-flex justify-content-between">
        <strong>{{ rep.Type }}</strong>
        <small class="text-white-50">{{ formatDate(rep.Date_Publication) }}</small>
      </div>
      <div class="formatted-content" v-html="nettoyerContenu(rep.Contenu)"></div>
    </div>
  </div>

  <!-- ✍️ Répondre -->
  <div class="mt-3">
    <textarea
      v-model="reponses[fb.ID]"
      class="form-control mb-2"
      rows="2"
      placeholder="Répondre à ce feedback..."
    ></textarea>
    <div class="d-flex justify-content-end">
      <button 
        class="btn btn-sm btn-outline-success"
        @click="sendReply(fb.ID)"
        :disabled="!reponses[fb.ID] || sendingReply[fb.ID]"
      >
        {{ sendingReply[fb.ID] ? "Envoi..." : "Répondre" }}
      </button>
    </div>
  </div>
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
        reponses: {}, // Chaque feedback aura son champ texte
sendingReply: {},

        nouveauFeedback: "",
feedbackSentMessage: "",
sendingFeedback: false,
        feedbacks: [],
        feedbackLoading: false,
        feedbackError: null,
        routes: {
          GET: "AKfycbwCrvZUTP9W0dGCzgMO_wdfgQWXeke3xAWLiXIIR8TdT57IWE3V90xj_E2JZOxrtx4n2A/exec",
          POST: "AKfycbwCrvZUTP9W0dGCzgMO_wdfgQWXeke3xAWLiXIIR8TdT57IWE3V90xj_E2JZOxrtx4n2A/exec"
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
        async deleteFeedback(id) {
  if (!confirm("❗ Supprimer ce feedback ?")) return;

  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyPostURL(this.routes.POST);
  const payload = {
    route: "deletefeedback",
    jwt,
    feedback_id: Number(String(id).replace("ID", ""))
  };

  console.log("🧾 ID numérique final envoyé :", payload.feedback_id);
  console.log("📡 URL utilisée pour suppression :", url);
  console.log("📦 Payload complet :", payload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      console.log("🗑️ Feedback supprimé :", result.message);
      await this.fetchFeedbacks();
    } else {
      console.warn("❌ Erreur suppression :", result.message);
    }
  } catch (err) {
    console.error("❌ Erreur API deletefeedback :", err);
  }
}


,
nettoyerContenu(contenu) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = contenu.replace(/&nbsp;/g, ' ');
  return tempDiv.innerHTML;
}

,
        async sendReply(feedbackId) {
  const texte = this.reponses[feedbackId]?.trim();
  if (!texte) return;

  this.sendingReply[feedbackId] = true;

  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyPostURL(this.routes.POST);
  const payload = {
  route: "replytofeedback",
  jwt,
  feedback_id: feedbackId,
  contenu: texte,
  id_eleve: this.userData?.id || this.email,
  prenom: this.userData?.prenom || this.prenom
};

  console.log("📤 Payload envoyé pour reply:", payload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      this.reponses[feedbackId] = "";
      await this.fetchFeedbacks(); // Recharge les feedbacks avec les réponses
    } else {
      console.warn("❌ Erreur réponse feedback :", result.message);
    }
  } catch (err) {
    console.error("❌ Erreur API replytofeedback :", err);
  } finally {
    this.sendingReply[feedbackId] = false;
  }
}
,
async fetchFeedbacks() {
  this.feedbackLoading = true;
  this.feedbackError = null;

  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyURL(this.routes.GET, {
    route: "getfeedbacks",
    jwt,
    role: "admin"
  });

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.feedbacks) {
      const all = data.feedbacks;

      const idEleveActuel = this.userData?.id || this.email;

      // 🔍 Identifier les feedbacks principaux pour CE profil uniquement
      const principaux = all.filter(fb =>
        !fb.ID_Cours.startsWith("ID") &&
        fb.ID_Eleve === idEleveActuel
      );

      const reponses = all.filter(fb =>
        fb.ID_Cours && fb.ID_Cours.startsWith("ID")
      );

      // 💬 Associer chaque feedback à ses réponses
      this.feedbacks = principaux.reverse().map(fb => ({
        ...fb,
        reponses: reponses.filter(rep => rep.ID_Cours === fb.ID)
      }));
    } else {
      this.feedbackError = "Aucun feedback trouvé.";
    }
  } catch (err) {
    console.error("❌ Erreur récupération feedbacks :", err);
    this.feedbackError = "Erreur de chargement.";
  } finally {
    this.feedbackLoading = false;
  }
}







,
  
      getProxyURL(routeId, params = {}) {
        const baseURL = `https://script.google.com/macros/s/${routeId}`;
        const query = new URLSearchParams(params).toString();
        const fullURL = `${baseURL}?${query}`;
        return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(fullURL)}`;
      },
      getProxyPostURL(routeId) {
  const baseURL = `https://script.google.com/macros/s/${routeId}`;
  return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(baseURL)}`;
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
      },
      async sendFeedback() {
  if (!this.nouveauFeedback.trim()) return;

  this.sendingFeedback = true;
  this.feedbackSentMessage = "";

  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyPostURL(this.routes.POST);
  const payload = {
    route: "addfeedback",
    jwt,
    id_cours: "test", // 🔧 tu peux mettre une vraie valeur plus tard
    id_eleve: this.userData.id || this.email,
    prenom: this.prenom,
    contenu: this.nouveauFeedback.trim()
  };
  console.log("📡 URL POST brute :", this.getProxyPostURL(this.routes.POST));
console.log("🧾 Payload envoyé :", payload);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      this.feedbackSentMessage = "✅ Feedback envoyé !";
      this.nouveauFeedback = "";
      await this.fetchFeedbacks(); // Recharge les feedbacks
    } else {
      console.warn("❌ Erreur API :", result.message);
    }
  } catch (error) {
    console.error("❌ Erreur d'envoi de feedback :", error);
  } finally {
    this.sendingFeedback = false;
    setTimeout(() => (this.feedbackSentMessage = ""), 3000);
  }
},
async markAsRead(feedbackId) {
  console.log("📤 feedbackId reçu dans front :", feedbackId, typeof feedbackId);

  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyPostURL(this.routes.POST);
  const payload = {
    route: "validatefeedback",
    jwt,
    feedback_id: Number(feedbackId.replace("ID", ""))
 // 👈 Assure que c'est bien un nombre
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      console.log("✅ Statut mis à jour :", result.message);
      await this.fetchFeedbacks(); // Recharge la liste avec les feedbacks à jour
    } else {
      console.warn("❌ Erreur validation (payload complet) :", result);
    }
  } catch (err) {
    console.error("❌ Erreur API validatefeedback :", err);
  }
}

,
    }
  };
  </script>
  
  