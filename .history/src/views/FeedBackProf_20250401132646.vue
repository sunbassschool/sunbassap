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
