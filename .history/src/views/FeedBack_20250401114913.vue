<template>
    <Layout>
      <div class="container mt-4">
  
        <h2 class="text-white mb-4">📋 Tes Feedbacks</h2>
  
        <div v-if="feedbackLoading" class="text-center text-light">
          <div class="spinner-border custom-spinner"></div>
          <p>Chargement des feedbacks...</p>
        </div>
  
        <div v-if="feedbackError" class="alert alert-danger">
          {{ feedbackError }}
        </div>
  
        <div v-if="feedbacks.length && !feedbackLoading">
          <div 
            v-for="fb in feedbacks" 
            :key="fb.ID"
            class="dashboard-card rounded-3 p-3 mb-3"
          >
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge" :class="fb.Type === 'Prof' ? 'bg-primary' : 'bg-secondary'">
                {{ fb.Type }}
              </span>
              <small class="text-muted">
                {{ formatDate(fb.Date_Publication) }}
              </small>
            </div>
  
            <p class="text-light mb-2">{{ fb.Contenu }}</p>
  
            <div class="d-flex justify-content-between align-items-center">
              <span :class="fb.Statut === 'Validé' ? 'text-success' : 'text-warning'">
                {{ fb.Statut }}
              </span>
              <span class="small text-light">Par {{ fb.Auteur }}</span>
            </div>
          </div>
        </div>
  
        <div v-if="!feedbacks.length && !feedbackLoading" class="text-light text-center">
          Aucun feedback pour l’instant.
        </div>
  
      </div>
    </Layout>
  </template>
  