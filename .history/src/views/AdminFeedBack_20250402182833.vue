<template>
    <Layout>
      <div class="container mt-4">
        <h2 class="text-white mb-4">📝 Feedbacks Admin</h2>
  
        <!-- 🔍 Sélection élève -->
        <div class="mb-4">
          <label class="form-label text-light">Choisir un élève</label>
          <div class="input-group">
  <span class="input-group-text bg-dark text-light border-secondary">🔍</span>
  <input
    type="text"
    v-model="searchTerm"
    class="form-control bg-dark text-light border-secondary"
    placeholder="Tape un prénom ou email"
    @input="filterEleves"
  />
</div>
<ul v-if="filteredEleves.length" class="list-group mt-1 animated-list">
  <li
    v-for="e in filteredEleves"
    :key="e.email"
    class="list-group-item list-group-item-action"
    @click="selectEleve(e)"
    style="cursor: pointer;"
  >
    <strong>{{ e.prenom }} {{ e.nom }}</strong><br />
    <small class="text-muted">{{ e.email }}</small>
  </li>
</ul>

        </div>
        <div class="d-flex align-items-center mt-2">
  <button
    class="btn btn-sm btn-outline-warning"
    v-if="selectedEleve"
    @click="resetEleveSelection"
  >
    ❌ Réinitialiser le filtre élève
  </button>
</div>

        <!-- 💬 Formulaire feedback -->
        <div v-if="selectedEleve" class="mb-4">
          <h5 class="text-light">Ajouter un feedback pour {{ selectedEleve.prenom }}</h5>
          <QuillEditor
  v-model:content="nouveauFeedback"
  content-type="html"
  theme="snow"
  placeholder="✍️ Écris ici ton feedback pour cet élève..."
  class="editor-light"
/>




          <button
            class="btn btn-success"
            @click="sendFeedback"
            :disabled="!nouveauFeedback || nouveauFeedback === '<p><br></p>'"

          >
            Envoyer le feedback
          </button>
          <div v-if="feedbackSentMessage" class="text-success mt-2">
            {{ feedbackSentMessage }}
          </div>
        </div>
  
        <!-- 📋 Feedbacks existants -->
        <div v-if="!feedbacks.length" class="text-light fst-italic mb-4">
  Aucun feedback pour l’instant.
</div>
<div v-if="selectedEleve && feedbacks.length">
    <div v-if="!selectedEleve" class="text-light fst-italic">
  🔍 Sélectionne un élève pour afficher ses feedbacks.
</div>

            <h5 class="text-white mb-3">
  📋 {{ selectedEleve ? `Feedbacks pour ${selectedEleve.prenom}` : "Historique global des feedbacks" }}
</h5>

          <div v-for="fb in feedbacks" :key="fb.ID" class="bg-dark text-light border rounded p-3 mb-3">
  <!-- 🎖️ Auteur + Date -->
  <div class="d-flex justify-content-between align-items-center mb-2">
    <strong>{{ fb.Type }}</strong>


    <small class="text-muted">{{ formatDate(fb.Date_Publication) }}</small>
  </div>

  <!-- 💬 Message -->
  <p class="formatted-content">{{ fb.Contenu }}</p>


  <!-- 📎 Statut -->
  <span class="badge bg-secondary">{{ fb.Statut }}</span>

<!-- 🔁 Réponses -->
<div v-if="reponsesMap[fb.ID]?.length" class="mt-3">
  <div
    v-for="rep in reponsesMap[fb.ID]"
    :key="rep.ID"
    class="response-block"
    :class="rep.Type === 'Prof' ? 'prof' : 'eleve'"
  >
    <div class="d-flex justify-content-between">
      <strong>{{ rep.Type }}</strong>
      <small>{{ formatDate(rep.Date_Publication) }}</small>
    </div>
    <div class="formatted-content" v-html="rep.Contenu"></div>
  </div>
</div>




<!-- ✍️ Zone de réponse -->
<div class="mt-3">
  <QuillEditor
    v-model:content="replies[fb.ID]"
    content-type="html"
    theme="snow"
  />
  <button
    class="btn btn-sm btn-outline-success mt-2"
    @click="sendReply(fb)"
    :disabled="!replies[fb.ID] || replies[fb.ID] === '<p><br></p>' || sendingReply[fb.ID]"
  >
    {{ sendingReply[fb.ID] ? "Envoi..." : "Répondre" }}
  </button>
</div>

</div>

        </div>
        <h5 class="text-white mb-3">📋 Historique global des feedbacks</h5>

      </div>
    </Layout>
  </template>
  
  <script>
import Layout from "@/views/Layout.vue";
import { getValidToken } from "@/utils/api.ts";
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
export default {
  name: "AdminFeedback",
  components: { Layout,    QuillEditor,
  },
  
  data() {
    return {
      eleves: [],
      feedbacksAll: [], // historique complet

      filteredEleves: [],
      replies: {},
sendingReply: {},
reponsesMap: {}, // Regroupement des réponses par feedback ID

      selectedEleve: null,
      searchTerm: "",
      nouveauFeedback: "",
      feedbackSentMessage: "",
      feedbacks: [],
      apiURL: "https://script.google.com/macros/s/AKfycbxbg-1G89l7q3ctyntpQceuwYdH53m-9QD9CXIHAQ-9PIFDAoVI3EmBOwmkswbs1AdTSg/exec"
    };
  },
  async mounted() {
    console.log("🔁 Chargement de la liste des élèves...");
    await this.fetchEleves();
await this.fetchAllFeedbacks();

  },
  methods: {
    async fetchEleves() {
      const url = this.getProxyURL({ route: "geteleves" });
      console.log("📡 URL utilisée pour geteleves :", url);

      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("📥 Réponse reçue :", data);
        if (Array.isArray(data)) {
          this.eleves = data;
          console.log("✅ Éleves chargés :", data.length);
        } else {
          console.warn("❌ Format inattendu reçu :", data);
        }
      } catch (err) {
        console.error("❌ Erreur lors du fetch geteleves :", err);
      }
    },
    resetEleveSelection() {
  this.selectedEleve = null;
  this.searchTerm = "";
  this.filteredEleves = [];
  this.organizeFeedbacks(this.feedbacksAll);

}
,
    async fetchAllFeedbacks() {
  const jwt = await getValidToken();
  const url = this.getProxyURL({ route: "getfeedbacks", jwt });
  console.log("📡 URL pour historique global :", url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    this.organizeFeedbacks(data.feedbacks || []);

    console.log("📥 Feedbacks initiaux :", this.feedbacks.length);
  } catch (err) {
    console.error("❌ Erreur fetchAllFeedbacks :", err);
  }
}
,
    filterEleves() {
      const term = this.searchTerm.toLowerCase();
      this.filteredEleves = this.eleves.filter(e =>
        `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(term)
      );
    },
    async selectEleve(eleve) {
  console.log("👤 Élève sélectionné :", eleve);
  this.selectedEleve = eleve;
  this.searchTerm = `${eleve.prenom} ${eleve.nom}`;
  this.filteredEleves = [];

  // Optionnel : recharge les feedbacks de la base (à commenter si tu veux éviter de re-fetch)
  // await this.fetchFeedbacks();

  // 🔍 Filtre localement
  this.filterFeedbacksForEleve(eleve);
}
,
    async fetchFeedbacks() {
      const jwt = await getValidToken();
      const url = this.getProxyURL({
        route: "getfeedbacks",
        jwt,
        id_eleve: this.selectedEleve.email
      });

      console.log("📡 URL utilisée pour getfeedbacks :", url);
      try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("📥 Feedbacks reçus :", data);
        this.organizeFeedbacks(data.feedbacks || []);

      } catch (err) {
        console.error("❌ Erreur lors du fetch getfeedbacks :", err);
      }
    },
    async sendFeedback() {
      const jwt = await getValidToken();
      const payload = {
        route: "addfeedback",
        jwt,
        id_cours: "prof",
        id_eleve: this.selectedEleve.email,
        prenom: this.selectedEleve.prenom,
        contenu: this.nouveauFeedback.trim(),
        type: "Prof" // 🔥 on ajoute explicitement
      };

      const url = this.getProxyPostURL();
      console.log("📤 Payload envoyé à addfeedback :", payload);
      console.log("🌐 URL POST utilisée :", url);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log("📥 Réponse addfeedback :", result);

        if (result.success) {
          this.feedbackSentMessage = "✅ Feedback envoyé !";
          this.nouveauFeedback = "";
          await this.fetchFeedbacks();
          setTimeout(() => (this.feedbackSentMessage = ""), 3000);
        }
      } catch (err) {
        console.error("❌ Erreur API addfeedback :", err);
      }
    },
    formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleString("fr-FR");
    },
    getProxyURL(params) {
      const base = `${this.apiURL}?` + new URLSearchParams(params).toString();
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(base)}`;
    },
    organizeFeedbacks(all) {
  this.feedbacksAll = all;

  const principaux = all.filter(fb => !String(fb.ID_Cours).startsWith("ID"));
  const reponses = all.filter(fb => String(fb.ID_Cours).startsWith("ID"));

  this.feedbacks = principaux.reverse();

  const map = {};
  for (const rep of reponses) {
    const parentId = rep.ID_Cours;
    if (!map[parentId]) map[parentId] = [];
    map[parentId].push(rep);
  }
  this.reponsesMap = map;
}

,
filterFeedbacksForEleve(eleve) {
  const id = eleve.email;
  const filtered = this.feedbacksAll.filter(fb =>
    !String(fb.ID_Cours).startsWith("ID") && fb.ID_Eleve === id
  );
  this.feedbacks = filtered.reverse();

  // Filtrer les réponses associées
  const reponses = this.feedbacksAll.filter(fb => String(fb.ID_Cours).startsWith("ID"));
  const map = {};
  for (const rep of reponses) {
    if (filtered.find(fb => fb.ID === rep.ID_Cours)) {
      const parentId = rep.ID_Cours;
      if (!map[parentId]) map[parentId] = [];
      map[parentId].push(rep);
    }
  }
  this.reponsesMap = map;
}
,
async sendReply(fb) {
  const texte = this.replies[fb.ID]?.trim();
  if (!texte) return;

  this.sendingReply = { ...this.sendingReply, [fb.ID]: true };


  const jwt = await getValidToken();
  const payload = {
    route: "replytofeedback",
    jwt,
    feedback_id: fb.ID,
    contenu: texte,
    id_eleve: fb.ID_Eleve,
    prenom: fb.Prenom,
    type: "Prof"
  };

  const url = this.getProxyPostURL();
  console.log("📤 Réponse envoyée :", payload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      this.replies[fb.ID] = "";
      await this.fetchFeedbacks();
    } else {
      console.warn("❌ Échec envoi :", result);
    }
  } catch (err) {
    console.error("❌ Erreur sendReply :", err);
  } finally {
    this.sendingReply = { ...this.sendingReply, [fb.ID]: false };

  }
}
,
    getProxyPostURL() {
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(this.apiURL)}`;
    }
  }
};
</script>

  
  <style scoped>
  
.animated-list {
  animation: fadeInList 0.25s ease-in;
}

@keyframes fadeInList {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-group-item {
  background-color: #1e1e1e;
  color: #f1f1f1;
  border: none;
  transition: background-color 0.2s ease;
}

.list-group-item:hover {
  background-color: #2c2c2c;
}




  .formatted-content {
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 0.95rem;
  color: #e0e0e0;
}

.response-block {
  background-color: #1f1f1f;
  border-left: 4px solid #6c757d;
  padding: 10px 15px;
  margin-top: 10px;
  border-radius: 4px;
}

.response-block strong {
  color: #81c784; /* vert léger pour "Prof" ou autre */
}

.response-block small {
  color: #b0b0b0;
  font-size: 0.8rem;
}

  .formatted-content {
  white-space: pre-wrap;
  line-height: 1.5;
}

  .list-group-item {
    background-color: #222;
    color: #fff;
  }
  .list-group-item:hover {
    background-color: #333;
  }
  .response-block.prof {
  border-left-color: #4caf50; /* vert */
}

.response-block.eleve {
  border-left-color: #2196f3; /* bleu */
}

.response-block strong {
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}
.input-group-text {
  border-radius: 0.375rem 0 0 0.375rem;
}

input.form-control {
  border-radius: 0 0.375rem 0.375rem 0;
}



  </style>
  <style>
  /* Quill en light mode */
  .editor-light .ql-container {
    background-color: #ffffff;
    color: #000;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
  
  .editor-light .ql-toolbar {
    background-color: #f8f9fa;
    border: 1px solid #ccc;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
  }
  
  .editor-light .ql-editor {
    min-height: 120px;
    padding: 10px;
    color: #212529;
    font-size: 1rem;
  }
  </style>
  