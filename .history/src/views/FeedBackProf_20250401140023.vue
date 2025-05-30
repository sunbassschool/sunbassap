<template>
  <Layout>
    <div class="container mt-4">
      <h2 class="text-white mb-4">📚 Feedbacks des élèves</h2>

      <div v-if="feedbackLoading" class="text-light text-center">
        <div class="spinner-border custom-spinner"></div>
        <p>Chargement en cours...</p>
      </div>

      <div v-if="feedbackError" class="alert alert-danger">{{ feedbackError }}</div>

      <div v-if="feedbacks.length && !feedbackLoading">
  <div v-for="fb in feedbacks" :key="fb.ID" class="dashboard-card p-3 mb-3">

    <!-- 🎓 Élève concerné -->
    <div class="mb-2 text-light">
      👤 <strong>{{ fb.Prenom }}</strong> | 📧 {{ fb.ID_Eleve }}
    </div>

    <!-- 💬 Contenu principal -->
    <p class="text-light mb-2">{{ fb.Contenu }}</p>

    <!-- 📅 Date + statut -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <small class="text-muted">{{ formatDate(fb.Date_Publication) }}</small>
      <span :class="fb.Statut === 'Validé' ? 'text-success' : 'text-warning'">
        {{ fb.Statut }}
      </span>
    </div>

    <!-- 📝 Marquer comme "Lu" -->
    <div class="form-check">
      <input 
        class="form-check-input"
        type="checkbox"
        :checked="fb.Statut === 'Lu'"
        @change="toggleReadStatus(fb)"
        id="statusCheckbox{{ fb.ID }}"
      />
      <label class="form-check-label" for="statusCheckbox{{ fb.ID }}">
        Marquer comme {{ fb.Statut === 'Lu' ? 'Non Lu' : 'Lu' }}
      </label>
    </div>

    <!-- 🧾 Réponses de l'élève -->
    <div v-if="fb.reponses && fb.reponses.length" class="mt-2">
      <div v-for="rep in fb.reponses" :key="rep.ID" class="bg-light text-dark p-2 mb-2 rounded">
        <div class="d-flex justify-content-between">
          <strong>{{ rep.Type }}</strong>
          <small>{{ formatDate(rep.Date_Publication) }}</small>
        </div>
        <p class="mb-0">{{ rep.Contenu }}</p>
      </div>
    </div>

    <!-- ✍️ Réponse du prof -->
    <div class="mt-2">
      <textarea
        v-model="reponses[fb.ID]"
        class="form-control mb-2"
        rows="2"
        placeholder="Répondre à ce feedback..."
      ></textarea>
      <div class="d-flex justify-content-end">
        <button
          class="btn btn-sm btn-outline-primary"
          @click="sendReply(fb.ID)"
          :disabled="!reponses[fb.ID] || sendingReply[fb.ID]"
        >
          {{ sendingReply[fb.ID] ? "Envoi..." : "Répondre" }}
        </button>
      </div>
    </div>

    <!-- 🗑️ Supprimer -->
    <div class="text-end mt-2">
      <button class="btn btn-sm btn-outline-danger" @click="deleteFeedback(fb.ID)">Supprimer</button>
    </div>
  </div>
</div>


      <div v-if="!feedbacks.length && !feedbackLoading" class="text-light text-center">
        Aucun feedback trouvé.
      </div>
    </div>
  </Layout>
</template>
<script>
import Layout from "../views/Layout.vue";
import { getValidToken } from "@/utils/api.ts";

export default {
  name: "FeedBackProf",
  components: { Layout },
  data() {
    return {
      feedbacks: [],
      reponses: {},
      sendingReply: {},
      feedbackError: null,
      feedbackLoading: false,
      routes: {
        GET: "AKfycbyuMJ_xju3y-I1XKDYzZ6-Xjjy5c5_7qUhDT-9-4u98RRtPwsoSG5kozSqaNJjZcd5pLw/exec",
        POST: "AKfycbyuMJ_xju3y-I1XKDYzZ6-Xjjy5c5_7qUhDT-9-4u98RRtPwsoSG5kozSqaNJjZcd5pLw/exec"
      },
    };
  },
  async mounted() {
    await this.fetchFeedbacks();
  },
  methods: {
    async fetchFeedbacks() {
      this.feedbackLoading = true;
      this.feedbackError = null;

      const jwt = await getValidToken();
      if (!jwt) return;

      const url = this.getProxyURL(this.routes.GET, {
        route: "getfeedbacks",
        jwt,
        role: "admin" // 👈 Spécifique pour le back si tu veux filtrer par prof
      });

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.feedbacks) {
          const all = data.feedbacks;
          const principaux = all.filter(fb => !fb.ID_Feedback_Relé);
          const reponses = all.filter(fb => fb.ID_Feedback_Relé);

          this.feedbacks = principaux.reverse().map(fb => ({
            ...fb,
            reponses: reponses.filter(r => String(r.ID_Feedback_Relé) === String(fb.ID).replace("ID", ""))
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
    },

    async sendReply(feedbackId) {
  const texte = this.reponses[feedbackId]?.trim();
  if (!texte) return;

  this.sendingReply[feedbackId] = true;

  const jwt = await getValidToken();
  if (!jwt) return;

  // Récupérer l'email et le prénom depuis localStorage
  const email = localStorage.getItem('email');  // Récupère l'email de l'admin
  const prenom = localStorage.getItem('prenom');  // Récupère le prénom de l'admin

  // Si l'email ou le prénom sont manquants, afficher un avertissement
  if (!email || !prenom) {
    console.warn("❌ email ou prenom manquants dans localStorage");
    this.sendingReply[feedbackId] = false;
    return;
  }

  // Le id_eleve pour l'admin est l'email de l'admin, et Type sera "Prof"
  const idEleve = email;  // ID Élève devient l'email de l'admin
  const type = "Prof";    // Type devient "Prof" car c'est l'admin qui répond

  const url = this.getProxyPostURL(this.routes.POST);
  const feedbackIdClean = feedbackId; // Utilise directement le feedbackId

  const payload = {
    route: "replytofeedback",
    jwt,
    feedback_id: feedbackIdClean,
    contenu: texte,
    id_eleve: idEleve,  // L'email de l'admin pour ID Élève
    prenom: prenom,     // Le prénom de l'admin récupéré depuis localStorage
    type: type          // Type est "Prof" pour l'admin
  };

  console.log("🧾 URL finale pour reply :", url);
  console.log("📤 Payload envoyé pour reply :", payload);

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

async deleteFeedback(feedbackId) {
  const jwt = await getValidToken();
  if (!jwt) return;

  const url = this.getProxyPostURL(this.routes.POST);
  const payload = {
    route: "deletefeedback",
    jwt,
    feedback_id: Number(String(feedbackId).replace("ID", ""))
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      await this.fetchFeedbacks(); // Recharge les feedbacks avec les réponses
    } else {
      console.warn("❌ Erreur suppression :", result.message);
    }
  } catch (err) {
    console.error("❌ Erreur API deletefeedback :", err);
  }
}
,
methods: {
  async toggleReadStatus(feedback) {
    // Récupérer le statut actuel du feedback
    const newStatus = feedback.Statut === 'Lu' ? 'Non Lu' : 'Lu';
    feedback.Statut = newStatus;  // Met à jour le statut localement

    // Log avant le fetch pour vérifier le payload
    console.log("Payload avant envoi : ", {
      route: "updatefeedbackstatus",  // L'endpoint backend
      jwt: await getValidToken(),
      feedback_id: feedback.ID,
      new_status: newStatus  // Le nouveau statut "Lu" ou "Non Lu"
    });

    const jwt = await getValidToken();
    if (!jwt) return;

    const url = this.getProxyPostURL(this.routes.POST);
    const payload = {
      route: "updatefeedbackstatus",  // L'endpoint backend
      jwt,
      feedback_id: feedback.ID,
      new_status: newStatus  // Le nouveau statut "Lu" ou "Non Lu"
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        console.log(`Feedback ${feedback.ID} mis à jour en statut : ${newStatus}`);
      } else {
        console.warn("❌ Erreur mise à jour du statut :", result.message);
      }
    } catch (err) {
      console.error("❌ Erreur API updatefeedbackstatus :", err);
    }
  }
}

  }
};
</script>
<style scoped>
/* Style des réponses intégrées */
.feedback-reply {
  background-color: rgba(255, 255, 255, 0.08);
  border-left: 4px solid #ff8c00;
  padding: 10px 15px;
  margin-top: 10px;
  border-radius: 6px;
  animation: fadeIn 0.4s ease-in-out;
}

.feedback-reply strong {
  color: #ffae42;
}

.feedback-reply small {
  color: #bbb;
}

.feedback-reply p {
  margin-bottom: 0;
  color: #f1f1f1;
  font-style: italic;
  font-size: 0.95rem;
}


</style>
