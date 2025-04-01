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
        GET: "AKfycbynpdA6cqaqzNBqLdK6cPJGOKTy5DOTNLeTdfzLVkkh4OvePOB0MOVEIwRQB_kJjhPHEQ/exec",
        POST: "AKfycbwkspwX4GP9ciYS3_hVJwNYOsioOFvSeqKE0trBUcHP67WXUP-_TbTE4dMOADViU3mM0Q/exec"
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
        role: "prof" // 👈 Spécifique pour le back si tu veux filtrer par prof
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

      const url = this.getProxyPostURL(this.routes.POST);
      const payload = {
        route: "replytofeedback",
        jwt,
        feedback_id: feedbackId,
        contenu: texte
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success) {
          this.reponses[feedbackId] = "";
          await this.fetchFeedbacks();
        } else {
          console.warn("❌ Erreur lors de l'envoi :", result.message);
        }
      } catch (err) {
        console.error("❌ Erreur API replytofeedback :", err);
      } finally {
        this.sendingReply[feedbackId] = false;
      }
    },

    async deleteFeedback(feedbackId) {
      if (!confirm("❗ Supprimer ce feedback ?")) return;

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
          await this.fetchFeedbacks();
        } else {
          console.warn("❌ Erreur suppression :", result.message);
        }
      } catch (err) {
        console.error("❌ Erreur API deletefeedback :", err);
      }
    },

    getProxyURL(routeId, params = {}) {
      const baseURL = `https://script.google.com/macros/s/${routeId}`;
      const query = new URLSearchParams(params).toString();
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(`${baseURL}?${query}`)}`;
    },

    getProxyPostURL(routeId) {
      const baseURL = `https://script.google.com/macros/s/${routeId}`;
      return `https://cors-proxy-sbs.vercel.app/api/proxy?url=${encodeURIComponent(baseURL)}`;
    },

    formatDate(dateString) {
      if (!dateString) return "Date inconnue";
      const date = new Date(dateString);
      return date.toLocaleString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }
};
</script>

